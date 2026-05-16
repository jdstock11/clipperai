import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import path from 'path';
import YTDlpWrap from 'yt-dlp-wrap';
import fs from 'fs';
import { VideoService, DIRS } from './services/video.service';

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

// ── Create clip (export) synchronously ───────────────────────────────
app.post('/api/create-clip', async (req, res) => {
  const { sourceUrl, streamUrl, startTime, endTime, format } = req.body;
  if (!sourceUrl || startTime === undefined || endTime === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const clipId = `clip_${Date.now()}`;

  // Choose extension based on format
  const ext = format === 'audio' ? 'mp3' : 'mp4';
  const outputFile = path.join(DIRS.uploads, `${clipId}.${ext}`);

  try {
    // Ensure demo-user exists
    await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' }
    });

    // Save to DB
    const clip = await prisma.clip.create({
      data: { userId: 'demo-user', sourceUrl, startTime, endTime, format: format || 'landscape', quality: 'MVP', status: 'PROCESSING' }
    });

    // ── REUSE local preview file — NO re-downloading ──
    let inputFile = '';

    // 1. Try the specific stream URL file first
    if (streamUrl) {
      const filename = path.basename(streamUrl);
      const previewPath = path.join(DIRS.previews, filename);
      if (fs.existsSync(previewPath) && fs.statSync(previewPath).size > 0) {
        inputFile = previewPath;
        console.log(`[clip] Using stream file for ${clipId}: ${previewPath}`);
      }
    }

    // 2. Fall back to any existing preview in the previews directory
    if (!inputFile) {
      const existing = VideoService.findExistingPreview();
      if (existing) {
        inputFile = existing;
        console.log(`[clip] Using existing preview for ${clipId}: ${existing}`);
      }
    }

    // 3. Last resort: download fresh (but this should rarely happen)
    if (!inputFile) {
      console.log(`[clip] No local file found, downloading for ${clipId}...`);
      const tempFile = path.join(DIRS.temp, `${clipId}_raw.mp4`);
      await VideoService.downloadPreview(sourceUrl, clipId);
      const downloaded = VideoService.findExistingPreview();
      if (downloaded) {
        inputFile = downloaded;
      } else {
        throw new Error('Could not obtain source video for export');
      }
    }

    console.log(`[clip] Trimming ${startTime}s → ${endTime}s, format=${format} for ${clipId}...`);
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
