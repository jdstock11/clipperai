import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { processCartoonJob, CartoonJobData } from '../workers/cartoonEngine.worker';

const router = express.Router();
const tempDir = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const upload = multer({ dest: path.join(tempDir, 'clipforge_temp'), limits: { fileSize: 500 * 1024 * 1024 } });

const jobStore = new Map<string, {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  message: string;
  stage?: string;
  result?: any;
  error?: string;
  logs: string[];
}>();

router.post('/generate', upload.single('file'), async (req, res) => {
  try {
    const { youtubeUrl, sourceUrl, streamUrl, mode, style, prompt } = req.body;
    const file = req.file;
    const isRandom = mode === 'random';

    if (!isRandom && !youtubeUrl && !file && !sourceUrl && !prompt) {
      return res.status(400).json({ error: 'Please provide a valid source (URL, file, or prompt).' });
    }

    const jobId = `cartoon_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const io = req.app.get('io');

    jobStore.set(jobId, {
      status: 'QUEUED',
      progress: 0,
      message: 'Queued...',
      stage: 'Preparing...',
      logs: [],
    });

    res.json({ jobId, status: 'QUEUED' });

    let finalMode: 'prompt' | 'url' | 'file' | 'random' = 'url';
    if (prompt) finalMode = 'prompt';
    else if (isRandom) finalMode = 'random';
    else if (file) finalMode = 'file';

    const jobData: CartoonJobData = {
      jobId,
      youtubeUrl: youtubeUrl || sourceUrl || streamUrl,
      file: file ? { path: file.path, originalname: file.originalname, mimetype: file.mimetype } : null,
      mode: finalMode,
      style: style || 'comedy',
      prompt
    };

    const emitProgress = (step: number, progress: number, message: string) => {
      const job = jobStore.get(jobId);
      if (job) {
        job.status = 'PROCESSING';
        job.progress = progress;
        job.message = message;
        job.stage = message;
        job.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
      }
      if (io) {
        io.emit('jobProgress', { jobId, step, progress, message, stage: message });
      }
    };

    processCartoonJob(jobData, emitProgress)
      .then((videoUrl) => {
        const job = jobStore.get(jobId);
        if (job) {
          job.status = 'COMPLETED';
          job.progress = 100;
          job.message = 'Complete!';
          job.result = { fileUrl: videoUrl, downloadUrl: videoUrl };
        }
        if (io) {
          io.emit('jobComplete', { jobId, videoUrl });
        }
        console.log(`[CartoonEngine] Job ${jobId} completed: ${videoUrl}`);
      })
      .catch((err) => {
        const job = jobStore.get(jobId);
        if (job) {
          job.status = 'FAILED';
          job.error = err.message;
          job.message = 'Failed: ' + err.message;
        }
        if (io) {
          io.emit('jobError', { jobId, error: err.message });
        }
        console.error(`[CartoonEngine] Job ${jobId} failed:`, err.message);
      });

  } catch (error: any) {
    console.error('[CartoonEngine] Route error:', error.message);
    res.status(500).json({ error: 'Failed to start: ' + error.message });
  }
});

router.get('/status/:jobId', (req, res) => {
  const job = jobStore.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    jobId: req.params.jobId,
    ...job,
  });
});

export default router;
