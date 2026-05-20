import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import YTDlpWrap from 'yt-dlp-wrap';
import fs from 'fs';
import { VideoService, DIRS } from './services/video.service';
import { CartoonService } from './services/cartoon.service';
import { renderQueue } from './queue/renderQueue';
import multer from 'multer';
import './workers/renderWorker';
import { executeYtDlpWithRetry, ensureYtDlpExists, getYtDlpWrap } from './utils/yt-dlp-helper';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import jwt from 'jsonwebtoken';

// ── JWT Middleware ───────────────────────────────────────────────────
export interface AuthRequest extends express.Request {
  user?: { id: string; role: string };
}

const verifyUser = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });
  
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Invalid token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// Simple in-memory cache for metadata and preview statuses
const metadataCache = new Map<string, { data: any, timestamp: number }>();
const previewStatusCache = new Map<string, any>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

dotenv.config();

// ── yt-dlp binary ────────────────────────────────────────────────────
// Run dynamic initialization and updates on startup
ensureYtDlpExists().then(() => {
  console.log('[yt-dlp] Startup binary check complete.');
}).catch(e => {
  console.error('[yt-dlp] Startup binary check failed:', e.message);
});

// ── Express ──────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://project-1jepj.vercel.app'
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow localhost/127.0.0.1 dynamically
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    // Allow Vercel preview URLs dynamically
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Check specific allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

const io = new SocketIOServer(server, {
  cors: corsOptions
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('[socket] Admin connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[socket] Admin disconnected:', socket.id);
  });
});

const prisma = new PrismaClient();
app.set('trust proxy', 1); // Trust first proxy (Render/Railway/Vercel)
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 4000;

// =====================================================================
// ENDPOINTS
// =====================================================================

const upload = multer({ dest: DIRS.temp, limits: { fileSize: 500 * 1024 * 1024 } });

// ── Auth & Admin Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ── Upload video (Local File) ────────────────────────────────────────
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No video file provided' });

    const previewId = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newPath = path.join(DIRS.previews, `${previewId}_raw${path.extname(file.originalname)}`);

    fs.renameSync(file.path, newPath);

    const metadata = await VideoService.getVideoMetadata(newPath);

    // We return a "fake" URL that the frontend can use to reference this local file
    // Generate absolute path for streamUrl so frontend doesn't get mixed content
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers.host;
    const streamUrl = `${protocol}://${host}/api/stream/${path.basename(newPath)}`;
    res.json({
      url: `local://${newPath}`,
      streamUrl,
      duration: metadata.duration,
      status: 'ready'
    });
  } catch (error: any) {
    console.error('[upload] Error:', error.message);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// ── Health check ─────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: 'lightweight-mvp' });
});

// ── Fetch video metadata (from YouTube) ──────────────────────────────
app.post('/api/fetch-video', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log('[fetch] Fetch started');
    console.log('[fetch] URL:', url);
    console.log('[fetch] Temp dir:', DIRS.temp);

    // Step 10: Cache Video Metadata
    const cached = metadataCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('[fetch] Returning cached metadata for:', url);
      return res.json(cached.data);
    }

    const args = [
      url, 
      '--no-playlist', 
      '--dump-json',
      '--no-warnings'
    ];

    // Use robust retry system with bot bypassing
    const raw = await executeYtDlpWithRetry(args, 25000, 2);
    const m = JSON.parse(raw);

    let videoId = '';
    try { const u = new URL(url); videoId = u.searchParams.get('v') || u.pathname.split('/').pop() || ''; } catch { }

    const responseData = {
      title: m.title,
      thumbnail: m.thumbnail,
      duration: m.duration,
      description: (m.description || '').substring(0, 200),
      uploader: m.uploader || '',
      viewCount: m.view_count || 0,
      videoId,
      width: m.width || 1920,
      height: m.height || 1080,
    };

    metadataCache.set(url, { data: responseData, timestamp: Date.now() });

    res.json(responseData);
  } catch (error: any) {
    console.error('FULL FETCH ERROR:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch video metadata' });
  }
});

// ── Prepare preview (Asynchronous API for Smart Proxy) ────────────────
app.post('/api/prepare-preview', async (req, res) => {
  const { url, duration } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let localFile = '';
  if (url.startsWith('local://')) {
    localFile = url.replace('local://', '');
  }

  // Generate an ID for this preview job
  const previewId = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[preview] Kicking off async preview generation: ${previewId}`);

  // Initialize status
  previewStatusCache.set(previewId, { status: 'processing' });
  
  // Return immediately to unblock the frontend
  res.json({ previewId, status: 'processing' });

  // Run generation in the background
  (async () => {
    try {
      // Clean old previews (except current local upload)
      try {
        fs.readdirSync(DIRS.previews).forEach(f => {
          const fp = path.join(DIRS.previews, f);
          if (fp !== localFile) {
            try { fs.unlinkSync(fp); } catch { /* ignore */ }
          }
        });
      } catch { /* ignore */ }

      let finalPath = '';

      if (localFile) {
        if (!fs.existsSync(localFile)) throw new Error(`Local file not found: ${localFile}`);
        console.log(`[preview] Processing local file: ${localFile}`);
        finalPath = await VideoService.encodeLocalPreview(localFile, previewId);
      } else {
        const rawPath = await VideoService.downloadPreview(url, previewId);
        finalPath = rawPath;
        try {
          finalPath = await VideoService.encodePreview(rawPath, previewId);
        } catch {
          console.warn('[preview] Encode failed, using raw download');
        }
      }

      if (!fs.existsSync(finalPath) || fs.statSync(finalPath).size === 0) {
        throw new Error('Preview file is empty or missing after processing');
      }

      const metadata = await VideoService.getVideoMetadata(finalPath);
      const thumbnails = await VideoService.generateThumbnail(finalPath, previewId);
      // Generate absolute URL for stream
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host;
      const streamUrl = `${protocol}://${host}/api/stream/${path.basename(finalPath)}`;

      // Update cache with success
      previewStatusCache.set(previewId, {
        status: 'ready',
        streamUrl,
        thumbnails,
        metadata
      });
      console.log(`[preview] ${previewId} generation complete`);
    } catch (err: any) {
      console.error(`[preview] Failed: ${previewId} —`, err.message);
      previewStatusCache.set(previewId, { status: 'failed', error: err.message });
    }
  })();
});

// ── Preview Status Polling ───────────────────────────────────────────
app.get('/api/preview-status/:previewId', (req, res) => {
  const status = previewStatusCache.get(req.params.previewId);
  if (!status) return res.status(404).json({ error: 'Preview job not found' });
  res.json(status);
});

// ── Stream video file (with range support for seeking) ───────────────
app.get('/api/stream/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  let filePath = path.join(DIRS.previews, filename);
  if (!fs.existsSync(filePath)) filePath = path.join(DIRS.uploads, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ── Cut Video (export via Queue, with direct fallback) ────────────────
app.post('/api/cut-video', verifyUser, async (req: AuthRequest, res: express.Response) => {
  const { sourceUrl, streamUrl, startTime, endTime, format, cuts, watermark, quality } = req.body;
  if (!sourceUrl) {
    return res.status(400).json({ error: 'Missing sourceUrl' });
  }

  const clipId = `clip_${Date.now()}`;
  const userId = req.user?.id;

  try {
    const clip = await prisma.clip.create({
      data: {
        userId: userId as string,
        sourceUrl,
        startTime: startTime || 0,
        endTime: endTime || 0,
        format: format || 'landscape',
        quality: quality || 'HD 720p',
        status: 'PENDING',
        cuts: cuts ? JSON.stringify(cuts) : undefined
      }
    });

    const jobRecord = await prisma.job.create({
      data: {
        type: 'RENDER_CLIP',
        status: 'PENDING',
        data: JSON.stringify({ clipId: clip.id, sourceUrl, streamUrl, cuts, startTime, endTime, format, watermark })
      }
    });

    // Try BullMQ queue first; if Redis is down, fall back to direct processing
    let useQueue = false;
    try {
      await renderQueue.add('render', {
        jobId: jobRecord.id,
        clipId: clip.id,
        sourceUrl, streamUrl, cuts, startTime, endTime, format, watermark
      });
      useQueue = true;
    } catch (queueErr: any) {
      console.warn('[cut] Redis/BullMQ unavailable, using direct processing:', queueErr.message);
    }

    if (useQueue) {
      res.json({ jobId: jobRecord.id, clipId: clip.id, status: 'PROCESSING' });
    } else {
      // ── Direct processing fallback (no Redis needed) ──
      await prisma.job.update({ where: { id: jobRecord.id }, data: { status: 'PROCESSING', progress: 10 } });

      // Resolve input file
      let inputFile = '';
      if (streamUrl) {
        const filename = path.basename(streamUrl);
        // SMART PROXY: Swap proxy for raw source to maintain original quality on export
        const rawFilename = filename.replace('_encoded', '_raw');
        const rawPath = path.join(DIRS.previews, rawFilename);
        const encodedPath = path.join(DIRS.previews, filename);
        
        if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 0) {
          inputFile = rawPath;
          console.log(`[cut] Using high-quality source: ${rawFilename}`);
        } else if (fs.existsSync(encodedPath) && fs.statSync(encodedPath).size > 0) {
          inputFile = encodedPath;
        }
      }
      if (!inputFile) {
        const existing = VideoService.findExistingPreview();
        if (existing) inputFile = existing;
      }
      if (!inputFile) {
        await VideoService.downloadPreview(sourceUrl, clipId);
        const downloaded = VideoService.findExistingPreview();
        if (downloaded) inputFile = downloaded;
        else throw new Error('Could not obtain source video for export');
      }

      const ext = format === 'audio' ? 'mp3' : 'mp4';
      const outputFile = path.join(DIRS.uploads, `${clipId}.${ext}`);

      const onProgress = async (percent: number) => {
        try {
          await prisma.job.update({ where: { id: jobRecord.id }, data: { progress: Math.round(percent) } });
        } catch { /* ignore */ }
      };

      if (cuts && Array.isArray(cuts) && cuts.length > 0) {
        await VideoService.processMultiClip(inputFile, outputFile, format, cuts, watermark, onProgress, quality || 'HD 720p');
      } else {
        await VideoService.processClip(inputFile, outputFile, format, startTime, endTime, watermark, onProgress, undefined, quality || 'HD 720p');
      }

      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host;
      const fileUrl = `${protocol}://${host}/uploads/${path.basename(outputFile)}`;
      await prisma.clip.update({ where: { id: clip.id }, data: { status: 'COMPLETED', fileUrl } });
      await prisma.job.update({ where: { id: jobRecord.id }, data: { status: 'COMPLETED', progress: 100, result: JSON.stringify({ fileUrl }) } });

      res.json({ jobId: jobRecord.id, clipId: clip.id, status: 'PROCESSING' });
    }
  } catch (error: any) {
    console.error('[cut] Error:', error.message);
    res.status(500).json({ error: 'Failed to process clip: ' + error.message });
  }
});

// ── Merge Videos ────────────────────────────────────────────────────────
app.post('/api/merge-video', verifyUser, async (req: AuthRequest, res: express.Response) => {
  const { urls, format, textLayers, quality } = req.body;
  if (!urls || !Array.isArray(urls) || urls.length < 2) {
    return res.status(400).json({ error: 'At least two video URLs are required for merging' });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const clipId = `merge_${Date.now()}`;
  const userId = req.user?.id;

  try {
    // We can also create a clip record for the merged video if desired,
    // but the current logic creates a job. We'll just pass the job.
    const jobRecord = await prisma.job.create({
      data: {
        id: jobId,
        type: 'MERGE_VIDEOS',
        status: 'PROCESSING',
        progress: 10,
        data: JSON.stringify({ urls, format, userId }) // Optional: track user ID in job data
      }
    });

    res.json({ jobId: jobRecord.id, status: 'PROCESSING' });

    // Process asynchronously (direct fallback approach)
    (async () => {
      try {
        const inputPaths: string[] = [];
        
        for (const url of urls) {
          if (url.startsWith('/api/stream/')) {
            const filename = path.basename(url);
            // SMART PROXY: Swap proxy for raw source
            const rawFilename = filename.replace('_encoded', '_raw');
            const rawPath = path.join(DIRS.previews, rawFilename);
            const encodedPath = path.join(DIRS.previews, filename);
            let fp = rawPath;
            
            if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 0) {
              fp = rawPath;
              console.log(`[merge] Using high-quality source: ${rawFilename}`);
            } else if (fs.existsSync(encodedPath) && fs.statSync(encodedPath).size > 0) {
              fp = encodedPath;
            } else {
              fp = path.join(DIRS.uploads, filename);
            }
            
            if (fs.existsSync(fp) && fs.statSync(fp).size > 0) {
              inputPaths.push(fp);
            } else {
              throw new Error(`File not found for stream: ${filename}`);
            }
          } else if (url.startsWith('local://')) {
            const fp = url.replace('local://', '');
            if (fs.existsSync(fp)) inputPaths.push(fp);
            else throw new Error(`Local file not found: ${fp}`);
          } else {
            // Unhandled external url
            throw new Error(`Unsupported URL type in merge: ${url}`);
          }
        }

        const ext = 'mp4';
        const outputFile = path.join(DIRS.uploads, `${clipId}.${ext}`);

        const onProgress = async (percent: number) => {
          try {
            await prisma.job.update({ where: { id: jobRecord.id }, data: { progress: Math.round(percent) } });
          } catch { /* ignore */ }
        };

        await VideoService.mergeVideos(inputPaths, outputFile, format || 'landscape', onProgress, textLayers, quality || 'HD 720p');

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host;
        const fileUrl = `${protocol}://${host}/uploads/${path.basename(outputFile)}`;
        await prisma.job.update({ 
          where: { id: jobRecord.id }, 
          data: { status: 'COMPLETED', progress: 100, result: JSON.stringify({ fileUrl }) } 
        });

      } catch (err: any) {
        console.error('[merge] Async error:', err.message);
        await prisma.job.update({ 
          where: { id: jobRecord.id }, 
          data: { status: 'FAILED', error: err.message } 
        }).catch(() => {});
      }
    })();

  } catch (error: any) {
    console.error('[merge] Route error:', error.message);
    res.status(500).json({ error: 'Failed to initiate merge: ' + error.message });
  }
});

const cartoonJobs = new Map<string, any>();

// ── AI Cartoon Generation ─────────────────────────────────────────────
app.post('/api/generate-cartoon', async (req: AuthRequest, res: express.Response) => {
  const { sourceUrl, streamUrl, style, startTime, endTime } = req.body;
  if (!sourceUrl) {
    return res.status(400).json({ error: 'Missing sourceUrl' });
  }

  const clipId = `cartoon_${Date.now()}`;
  const userId = req.user?.id;

  try {
    const jobId = `job_cartoon_${Date.now()}`;
    cartoonJobs.set(jobId, {
      id: jobId,
      type: 'RENDER_CARTOON',
      status: 'PENDING',
      progress: 0,
      data: JSON.stringify({ sourceUrl, streamUrl, style, startTime, endTime })
    });

    res.json({ jobId, status: 'PROCESSING' });

    // Direct processing (async)
    (async () => {
      try {
        const updateJob = (data: any) => {
          const current = cartoonJobs.get(jobId);
          if (current) cartoonJobs.set(jobId, { ...current, ...data });
        };

        updateJob({ status: 'PROCESSING', progress: 10 });

        // Resolve input file
        let inputFile = '';
        if (streamUrl) {
          const filename = path.basename(streamUrl);
          const rawFilename = filename.replace('_encoded', '_raw');
          const rawPath = path.join(DIRS.previews, rawFilename);
          const encodedPath = path.join(DIRS.previews, filename);
          
          if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 0) {
            inputFile = rawPath;
            console.log(`[cartoon] Using high-quality source: ${rawFilename}`);
          } else if (fs.existsSync(encodedPath) && fs.statSync(encodedPath).size > 0) {
            inputFile = encodedPath;
          }
        }
        if (!inputFile) {
          const existing = VideoService.findExistingPreview();
          if (existing) inputFile = existing;
        }
        if (!inputFile) {
          await VideoService.downloadPreview(sourceUrl, clipId);
          const downloaded = VideoService.findExistingPreview();
          if (downloaded) inputFile = downloaded;
          else throw new Error('Could not obtain source video for export');
        }

        const outputFile = path.join(DIRS.uploads, `${clipId}.mp4`);

        const onProgress = async (percent: number, stage?: string) => {
          try {
            updateJob({ progress: Math.round(percent), stage: stage || '' });
          } catch { /* ignore */ }
        };

        // Call the AI frame-by-frame cartoon pipeline
        await CartoonService.processCartoonAI(inputFile, outputFile, style || 'Anime', startTime, endTime, onProgress);

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host;
        const fileUrl = `${protocol}://${host}/uploads/${path.basename(outputFile)}`;
        const downloadUrl = `${protocol}://${host}/api/download/${path.basename(outputFile)}`;
        const resultObj = { fileUrl, downloadUrl };
        updateJob({ status: 'COMPLETED', progress: 100, result: JSON.stringify(resultObj) });

      } catch (err: any) {
        console.error('[cartoon] Async error:', err.message);
        const current = cartoonJobs.get(jobId);
        if (current) cartoonJobs.set(jobId, { ...current, status: 'FAILED', error: err.message });
      }
    })();

  } catch (error: any) {
    console.error('[cartoon] Route error:', error.message);
    res.status(500).json({ error: 'Failed to initiate cartoon generation: ' + error.message });
  }
});

// ── Cartoon Job polling endpoint ─────────────────────────────────────────────
app.get('/api/cartoon-jobs/:id', (req, res) => {
  const job = cartoonJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ── Create clip (Asynchronous) for Viral Clips ─────────────────────────
app.post('/api/create-clip', async (req: express.Request, res: express.Response) => {
  const { sourceUrl, streamUrl, startTime, endTime, format, textLayers, quality } = req.body;
  if (!sourceUrl || startTime === undefined || endTime === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const clipId = `clip_${Date.now()}`;
  const ext = format === 'audio' ? 'mp3' : 'mp4';
  const outputFile = path.join(DIRS.uploads, `${clipId}.${ext}`);
  const jobId = `job_clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const jobRecord = await prisma.job.create({
      data: {
        id: jobId,
        type: 'RENDER_CLIP',
        status: 'PROCESSING',
        progress: 10,
        data: JSON.stringify({ sourceUrl, streamUrl, startTime, endTime, format, quality })
      }
    });

    res.json({ jobId, clipId, status: 'PROCESSING' });

    // Process asynchronously
    (async () => {
      try {
        let inputFile = '';

        if (streamUrl) {
          const filename = path.basename(streamUrl);
          const rawFilename = filename.replace('_encoded', '_raw');
          const rawPath = path.join(DIRS.previews, rawFilename);
          const encodedPath = path.join(DIRS.previews, filename);
          
          if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 0) {
            inputFile = rawPath;
            console.log(`[clip] Using high-quality source: ${rawFilename}`);
          } else if (fs.existsSync(encodedPath) && fs.statSync(encodedPath).size > 0) {
            inputFile = encodedPath;
          }
        }

        if (!inputFile) {
          const existing = VideoService.findExistingPreview();
          if (existing) inputFile = existing;
        }

        if (!inputFile) {
          await VideoService.downloadPreview(sourceUrl, clipId);
          const downloaded = VideoService.findExistingPreview();
          if (downloaded) inputFile = downloaded;
          else throw new Error('Could not obtain source video for export');
        }

        const onProgress = async (percent: number) => {
          try {
            await prisma.job.update({ where: { id: jobRecord.id }, data: { progress: Math.round(percent) } });
          } catch { /* ignore */ }
        };

        await VideoService.processClip(inputFile, outputFile, format, startTime, endTime, undefined, onProgress, textLayers, quality || 'HD 720p');

        // Auto-cleanup temp file after 30 minutes if not downloaded
        setTimeout(() => {
          if (fs.existsSync(outputFile)) {
            try { fs.unlinkSync(outputFile); } catch (e) {}
          }
        }, 30 * 60 * 1000);

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host;
        const fileUrl = `${protocol}://${host}/uploads/${path.basename(outputFile)}`;
        const downloadUrl = `${protocol}://${host}/api/download/${path.basename(outputFile)}`;
        
        await prisma.job.update({ 
          where: { id: jobRecord.id }, 
          data: { status: 'COMPLETED', progress: 100, result: JSON.stringify({ fileUrl, downloadUrl }) } 
        });

      } catch (err: any) {
        console.error('[clip] Async error:', err.message);
        await prisma.job.update({ 
          where: { id: jobRecord.id }, 
          data: { status: 'FAILED', error: err.message } 
        }).catch(() => {});
      }
    })();

  } catch (error: any) {
    console.error('[clip] Route error:', error.message);
    res.status(500).json({ error: 'Failed to initiate clip creation: ' + error.message });
  }
});

// ── Job polling endpoint ─────────────────────────────────────────────
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    let parsedResult = null;
    if (job.result) {
      try { parsedResult = JSON.parse(job.result); } catch (e) { parsedResult = job.result; }
    }
    
    res.json({
      ...job,
      result: parsedResult
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// ── Download file (triggers Save As dialog) ─────────────────────────
app.get('/api/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(DIRS.uploads, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="clipforge-export.mp4"`);

  res.download(filePath, 'clipforge-export.mp4', (err) => {
    if (!err) {
      // Auto cleanup after successful download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }, 5000);
    }
  });
});

// ── AI Scene Analyzer (Mock Engine) ───────────────────────────────────
app.post('/api/analyze-video', async (req, res) => {
  const { url, duration } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Fallback duration if not provided
    const vidDuration = duration || 300; 
    
    // Generate intelligent mock clips based on video duration
    const clips = [];
    
    if (vidDuration > 60) {
      clips.push({
        id: 'clip_1',
        category: 'Comedy',
        title: 'Hilarious Reaction',
        reason: 'Funny reaction and audience-friendly humor perfectly suited for TikTok.',
        startTime: Math.max(0, vidDuration * 0.15),
        endTime: Math.min(vidDuration, vidDuration * 0.15 + 36),
        duration: 36,
        confidence: 96
      });
      
      clips.push({
        id: 'clip_2',
        category: 'Emotional',
        title: 'Deep Conversation',
        reason: 'High-retention emotional dialogue with strong engagement potential.',
        startTime: Math.max(0, vidDuration * 0.45),
        endTime: Math.min(vidDuration, vidDuration * 0.45 + 45),
        duration: 45,
        confidence: 91
      });
    }

    if (vidDuration > 120) {
      clips.push({
        id: 'clip_3',
        category: 'Action',
        title: 'Intense Climax',
        reason: 'Fast-paced sequence with high visual interest and dynamic movement.',
        startTime: Math.max(0, vidDuration * 0.75),
        endTime: Math.min(vidDuration, vidDuration * 0.75 + 28),
        duration: 28,
        confidence: 88
      });
    }

    if (clips.length === 0) {
      // Very short video fallback
      clips.push({
        id: 'clip_1',
        category: 'Viral',
        title: 'Key Moment',
        reason: 'The most engaging segment of this short video.',
        startTime: 0,
        endTime: Math.min(vidDuration, 30),
        duration: Math.min(vidDuration, 30),
        confidence: 95
      });
    }

    res.json({
      summary: "This video has been analyzed by ClipForge AI. It features a blend of humor, emotional depth, and fast-paced action. The AI has segmented the most engaging moments into ready-to-publish short-form clips optimized for high retention.",
      clips
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AI analysis failed: ' + error.message });
  }
});

// ── Static files ─────────────────────────────────────────────────────
app.use('/uploads', express.static(DIRS.uploads));
app.use('/previews', express.static(DIRS.previews));
app.use('/thumbnails', express.static(DIRS.thumbnails));

// ── Periodic cleanup (every 5 mins) ────────────────────────────────────
setInterval(() => { try { VideoService.cleanup(); } catch { } }, 300000);

// ── Start ────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] Running lightweight MVP on port ${PORT}`);
});
