import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import os from 'os';
import https from 'https';
import OpenAI from 'openai';
import Replicate from 'replicate';
import { DIRS } from './video.service';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const tempDir = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const CARTOON_DIR = path.join(tempDir, 'clipforge_cartoons');
if (!fs.existsSync(CARTOON_DIR)) fs.mkdirSync(CARTOON_DIR, { recursive: true });

export class CartoonEngineService {

  static async processPipeline(
    jobId: string,
    youtubeUrl: string | undefined,
    file: any,
    mode: string,
    style: string,
    emitProgress: (step: number, progress: number, message: string) => void,
    prompt?: string
  ): Promise<string> {
    const jobDir = path.join(CARTOON_DIR, jobId);
    if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });

    try {
      if (mode === 'prompt' && prompt) {
        return await this.generateFromPrompt(jobId, jobDir, prompt, style, emitProgress);
      } else {
        return await this.processVideoToCartoon(jobId, jobDir, youtubeUrl, file, style, emitProgress);
      }
    } catch (error) {
      try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
      throw error;
    }
  }

  private static async generateFromPrompt(
    jobId: string,
    jobDir: string,
    prompt: string,
    style: string,
    emitProgress: (step: number, progress: number, message: string) => void
  ): Promise<string> {
    
    // MOCK GENERATION (Since user does not have API keys)
    emitProgress(1, 10, '📝 Step 1: Parsing story into scenes with AI...');
    await this.delay(2000);
    
    emitProgress(2, 30, '🎨 Step 2: Generating cinematic base frames...');
    await this.delay(3000);

    emitProgress(3, 60, '🎥 Step 3: Animating frames into continuous video...');
    await this.delay(3000);

    emitProgress(4, 85, '🎵 Step 4: Adding cinematic transitions and music...');
    await this.delay(2000);

    emitProgress(5, 100, '🚀 Step 5: Exporting final short film...');
    await this.delay(1000);

    // Return a dummy placeholder video
    return "https://media.w3.org/2010/05/bunny/trailer.mp4";
  }

  private static async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  }

  private static async mergeVideos(
    videoPaths: string[],
    outputPath: string,
    jobDir: string
  ): Promise<void> {
    const concatFilePath = path.join(jobDir, 'concat.txt');
    const concatContent = videoPaths
      .map(fp => `file '${fp.replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    // Try to find a bgm file, or use a synthesized soft cinematic tone
    const bgmPath = path.join(process.cwd(), 'assets', 'bgm', 'cinematic.mp3');
    const hasBgm = fs.existsSync(bgmPath);

    return new Promise<void>((resolve, reject) => {
      let command = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0']);

      if (hasBgm) {
        command = command.input(bgmPath).inputOptions(['-stream_loop', '-1']);
      } else {
        // Synthesize a soft atmospheric chord progression
        command = command.input('aevalsrc=0.1*sin(2*PI*261.63*t)+0.1*sin(2*PI*329.63*t)+0.1*sin(2*PI*392.00*t):d=30')
                         .inputOptions(['-f', 'lavfi']);
      }

      command
        .outputOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', '24',
          '-preset', 'fast',
          '-crf', '23',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-shortest', // Ensure video stops when the shortest stream (video) ends
          '-movflags', '+faststart',
          '-y',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private static async processVideoToCartoon(
    jobId: string,
    jobDir: string,
    youtubeUrl: string | undefined,
    file: any,
    style: string,
    emitProgress: (step: number, progress: number, message: string) => void
  ): Promise<string> {
    emitProgress(1, 100, 'Dummy output for non-prompt mode.');
    return "https://media.w3.org/2010/05/bunny/trailer.mp4";
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
