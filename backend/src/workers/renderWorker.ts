import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { VideoService, DIRS } from '../services/video.service';
import { redisConnection, isRedisAvailable } from '../queue/renderQueue';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Only create the BullMQ worker after a short delay to allow Redis connection attempt
setTimeout(() => {
  if (!isRedisAvailable()) {
    console.log('[worker] Redis not available — BullMQ worker disabled. Using direct processing fallback.');
    return;
  }

  const renderWorker = new Worker('render-queue', async (job: Job) => {
    const { clipId, jobId, sourceUrl, streamUrl, cuts, format } = job.data;
    
    await prisma.job.update({ 
      where: { id: jobId }, 
      data: { status: 'PROCESSING', progress: 10 } 
    });
    
    try {
      let inputFile = '';

      // 1. Try the specific stream URL file first
      if (streamUrl) {
        const filename = path.basename(streamUrl);
        const previewPath = path.join(DIRS.previews, filename);
        if (fs.existsSync(previewPath) && fs.statSync(previewPath).size > 0) {
          inputFile = previewPath;
          console.log(`[worker] Using stream file for ${clipId}: ${previewPath}`);
        }
      }

      // 2. Fall back to any existing preview
      if (!inputFile) {
        const existing = VideoService.findExistingPreview();
        if (existing) {
          inputFile = existing;
          console.log(`[worker] Using existing preview for ${clipId}: ${existing}`);
        }
      }

      // 3. Download fresh
      if (!inputFile) {
        console.log(`[worker] No local file found, downloading for ${clipId}...`);
        await VideoService.downloadPreview(sourceUrl, clipId);
        const downloaded = VideoService.findExistingPreview();
        if (downloaded) {
          inputFile = downloaded;
        } else {
          throw new Error('Could not obtain source video for export');
        }
      }

      const ext = format === 'audio' ? 'mp3' : 'mp4';
      const outputFile = path.join(DIRS.uploads, `${clipId}.${ext}`);

      console.log(`[worker] Processing clip ${clipId}, format=${format}...`);
      
      const onProgress = async (percent: number) => {
        try {
          await job.updateProgress(Math.round(percent));
          await prisma.job.update({
            where: { id: jobId },
            data: { progress: Math.round(percent) }
          });
        } catch (err) {
          // ignore progress update errors
        }
      };

      // Support multi-cut array OR fallback to single cut
      if (cuts && Array.isArray(cuts) && cuts.length > 0) {
        const { watermark } = job.data;
        await VideoService.processMultiClip(inputFile, outputFile, format, cuts, watermark, onProgress);
      } else {
        // Fallback for single trim if cuts not provided
        const { startTime, endTime, watermark } = job.data;
        await VideoService.processClip(inputFile, outputFile, format, startTime, endTime, watermark, onProgress);
      }

      const fileUrl = `/uploads/${path.basename(outputFile)}`;

      await prisma.clip.update({
        where: { id: clipId },
        data: { status: 'COMPLETED', fileUrl }
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', progress: 100, result: JSON.stringify({ fileUrl }) }
      });

      return { fileUrl };

    } catch (error: any) {
      await prisma.clip.update({ where: { id: clipId }, data: { status: 'FAILED' } });
      await prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED', error: error.message } });
      throw error;
    }
  }, { connection: redisConnection });

  renderWorker.on('completed', job => {
    console.log(`[worker] Job ${job.id} completed successfully`);
  });

  renderWorker.on('failed', (job, err) => {
    console.log(`[worker] Job ${job?.id} failed with ${err.message}`);
  });

  console.log('[worker] BullMQ render worker started successfully.');
}, 3000); // 3s delay to let Redis connect attempt finish
