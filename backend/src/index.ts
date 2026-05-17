import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import path from 'path';
import YTDlpWrap from 'yt-dlp-wrap';
import fs from 'fs';
import { VideoService, DIRS } from './services/video.service';
import { renderQueue } from './queue/renderQueue';
import multer from 'multer';
import './workers/renderWorker';

dotenv.config();

// ── yt-dlp binary ────────────────────────────────────────────────────
const isWin = process.platform === 'win32';
const ytDlpPath = path.join(__dirname, isWin ? '../yt-dlp.exe' : '../yt-dlp');
if (!fs.existsSync(ytDlpPath)) {
  console.log('[yt-dlp] Downloading binary...');
  YTDlpWrap.downloadFromGithub(ytDlpPath)
    .then(() => console.log('[yt-dlp] Downloaded to', ytDlpPath))
    .catch(e => console.error('[yt-dlp] Download failed:', e.message));
}

// ── Express ──────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// =====================================================================
// ENDPOINTS
// =====================================================================

const upload = multer({ dest: DIRS.temp, limits: { fileSize: 500 * 1024 * 1024 } });

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
    const streamUrl = `/api/stream/${path.basename(newPath)}`;
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

    console.log('[fetch] Getting metadata for:', url);
    const yt = new YTDlpWrap(ytDlpPath);
    const raw = await yt.execPromise([url, '--no-playlist', '--dump-json']);
    const m = JSON.parse(raw);

    let videoId = '';
    try { const u = new URL(url); videoId = u.searchParams.get('v') || u.pathname.split('/').pop() || ''; } catch {}

    res.json({
      title: m.title,
      thumbnail: m.thumbnail,
      duration: m.duration,
      description: (m.description || '').substring(0, 200),
      uploader: m.uploader || '',
      viewCount: m.view_count || 0,
      videoId,
      width: m.width || 1920,
      height: m.height || 1080,
    });
  } catch (error: any) {
    console.error('[fetch] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch video metadata' });
  }
});

// ── Prepare preview (Synchronous API) ────────────────────────────────
app.post('/api/prepare-preview', async (req, res) => {
  const { url, duration } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Delete old previews before generating new ones to prevent cache issues
  try {
    fs.readdirSync(DIRS.previews).forEach(f => {
      const fp = path.join(DIRS.previews, f);
      try { fs.unlinkSync(fp); } catch { /* ignore */ }
    });
  } catch { /* ignore */ }

  const previewId = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[preview] Generating preview synchronously: ${previewId}`);

  try {
    const rawPath = await VideoService.downloadPreview(url, previewId);
    let finalPath = rawPath;
    
    try {
      finalPath = await VideoService.encodePreview(rawPath, previewId);
    } catch {
      console.warn('[preview] Encode failed, using raw download');
    }

    if (!fs.existsSync(finalPath) || fs.statSync(finalPath).size === 0) {
      throw new Error('Preview file is empty or missing after processing');
    }

    const metadata = await VideoService.getVideoMetadata(finalPath);
    const thumbnails = await VideoService.generateThumbnail(finalPath, previewId);
    const streamUrl = `/api/stream/${path.basename(finalPath)}`;

    res.json({
      previewId,
      status: 'ready',
      streamUrl,
      thumbnails,
      metadata,
    });
  } catch (err: any) {
    console.error(`[preview] Failed: ${previewId} —`, err.message);
    res.status(500).json({ error: 'Preview generation failed' });
  }
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
app.post('/api/cut-video', async (req, res) => {
  const { sourceUrl, streamUrl, cuts, startTime, endTime, format, watermark } = req.body;
  if (!sourceUrl) {
    return res.status(400).json({ error: 'Missing sourceUrl' });
  }

  const clipId = `clip_${Date.now()}`;

  try {
    await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' }
    });

    const clip = await prisma.clip.create({
      data: { 
        userId: 'demo-user', 
        sourceUrl, 
        startTime: startTime || 0, 
        endTime: endTime || 0, 
        format: format || 'landscape', 
        quality: 'MVP', 
        status: 'PENDING',
        cuts: cuts ? cuts : undefined
      }
    });

    const jobRecord = await prisma.job.create({
      data: {
        type: 'RENDER_CLIP',
        status: 'PENDING',
        data: { clipId: clip.id, sourceUrl, streamUrl, cuts, startTime, endTime, format, watermark }
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
        const previewPath = path.join(DIRS.previews, filename);
        if (fs.existsSync(previewPath) && fs.statSync(previewPath).size > 0) inputFile = previewPath;
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
        await VideoService.processMultiClip(inputFile, outputFile, format, cuts, watermark, onProgress);
      } else {
        await VideoService.processClip(inputFile, outputFile, format, startTime, endTime, watermark, onProgress);
      }

      const fileUrl = `/uploads/${path.basename(outputFile)}`;
      await prisma.clip.update({ where: { id: clip.id }, data: { status: 'COMPLETED', fileUrl } });
      await prisma.job.update({ where: { id: jobRecord.id }, data: { status: 'COMPLETED', progress: 100, result: { fileUrl } } });

      res.json({ jobId: jobRecord.id, clipId: clip.id, status: 'PROCESSING' });
    }
  } catch (error: any) {
    console.error('[cut] Error:', error.message);
    res.status(500).json({ error: 'Failed to process clip: ' + error.message });
  }
});

// ── Create clip (Synchronous) for Viral Clips ─────────────────────────
app.post('/api/create-clip', async (req, res) => {
  const { sourceUrl, streamUrl, startTime, endTime, format } = req.body;
  if (!sourceUrl || startTime === undefined || endTime === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const clipId = `clip_${Date.now()}`;
  const ext = format === 'audio' ? 'mp3' : 'mp4';
  const outputFile = path.join(DIRS.uploads, `${clipId}.${ext}`);

  try {
    await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' }
    });

    const clip = await prisma.clip.create({
      data: { userId: 'demo-user', sourceUrl, startTime, endTime, format: format || 'landscape', quality: 'MVP', status: 'PROCESSING' }
    });

    let inputFile = '';

    if (streamUrl) {
      const filename = path.basename(streamUrl);
      const previewPath = path.join(DIRS.previews, filename);
      if (fs.existsSync(previewPath) && fs.statSync(previewPath).size > 0) inputFile = previewPath;
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

    await VideoService.processClip(inputFile, outputFile, format, startTime, endTime);

    await prisma.clip.update({
      where: { id: clip.id },
      data: { status: 'COMPLETED', fileUrl: `/uploads/${path.basename(outputFile)}` }
    });

    res.json({ clipId: clip.id, fileUrl: `/uploads/${path.basename(outputFile)}` });
  } catch (error: any) {
    console.error('[clip] Error:', error.message);
    res.status(500).json({ error: 'Failed to create clip: ' + error.message });
  }
});

// ── Job polling endpoint ─────────────────────────────────────────────
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// ── Download file (triggers Save As dialog) ─────────────────────────
app.get('/api/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(DIRS.uploads, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath, filename);
});

// ── Static files ─────────────────────────────────────────────────────
app.use('/uploads', express.static(DIRS.uploads));
app.use('/previews', express.static(DIRS.previews));
app.use('/thumbnails', express.static(DIRS.thumbnails));

// ── Periodic cleanup (every hour) ────────────────────────────────────
setInterval(() => { try { VideoService.cleanup(); } catch {} }, 3600000);

// ── Start ────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] Running lightweight MVP on port ${PORT}`);
});
