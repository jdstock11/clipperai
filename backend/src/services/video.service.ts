import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import YTDlpWrap from 'yt-dlp-wrap';

const isWin = process.platform === 'win32';
const ytDlpPath = path.join(__dirname, isWin ? '../../yt-dlp.exe' : '../../yt-dlp');
const ytDlpWrap = new YTDlpWrap(ytDlpPath);

// ── Directory setup ──────────────────────────────────────────────────
const ROOT = path.join(__dirname, '../..');
const DIRS = {
  uploads: path.join(ROOT, 'uploads'),
  previews: path.join(ROOT, 'previews'),
  thumbnails: path.join(ROOT, 'thumbnails'),
  temp: path.join(ROOT, 'temp'),
};
// Create every required directory on startup
Object.values(DIRS).forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log(`[startup] Created directory: ${d}`);
  } else {
    console.log(`[startup] Validated directory: ${d}`);
  }
});

// ── FFmpeg / FFprobe path resolution ─────────────────────────────────
const ffmpegDir = ffmpegStatic ? path.dirname(ffmpegStatic) : '';
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

// Locate ffprobe binary shipped by ffprobe-static
const FFPROBE_CANDIDATES = [
  path.join(ROOT, 'node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe'),
  path.join(ROOT, 'node_modules/ffprobe-static/bin/darwin/x64/ffprobe'),
  path.join(ROOT, 'node_modules/ffprobe-static/bin/linux/x64/ffprobe'),
];
const ffprobeBin = FFPROBE_CANDIDATES.find(p => fs.existsSync(p));
if (ffprobeBin) {
  ffmpeg.setFfprobePath(ffprobeBin);
  console.log('[ffprobe] Using binary:', ffprobeBin);
} else {
  console.warn('[ffprobe] Binary NOT found – metadata features disabled');
}

// ── Helper ───────────────────────────────────────────────────────────
function fileExists(p: string): boolean {
  try { return fs.existsSync(p) && fs.statSync(p).size > 0; } catch { return false; }
}

/** yt-dlp may rename the output file (e.g. appending .webm or different extension). */
function findDownloadedFile(dir: string, prefix: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix));
  if (files.length === 0) return null;
  const mp4 = files.find(f => f.endsWith('.mp4'));
  return path.join(dir, mp4 || files[0]);
}

// ── Service ──────────────────────────────────────────────────────────
export class VideoService {

  /**
   * Download FULL video from YouTube at up to 720p with audio.
   * This is the ONLY download — both preview and export reuse this file.
   */
  static async downloadPreview(url: string, previewId: string): Promise<string> {
    const outputPath = path.join(DIRS.previews, `${previewId}_raw.mp4`);
    console.log(`[preview] Downloading full video → ${outputPath}`);

    return new Promise<string>((resolve, reject) => {
      const args = [
        url,
        '--no-playlist',
        // Prefer MP4+M4A for native browser compatibility; fallback to best available
        '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--no-warnings',
        '-o', outputPath,
      ];

      if (ffmpegDir) {
        args.push('--ffmpeg-location', ffmpegDir);
      }

      const proc = ytDlpWrap.exec(args);

      let stderr = '';
      proc.on('error', (err: Error) => {
        console.error('[preview] yt-dlp error:', err.message);
        reject(new Error('Download failed: ' + err.message));
      });

      if ((proc as any).ytDlpProcess?.stderr) {
        (proc as any).ytDlpProcess.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      }

      proc.on('close', (code) => {
        const actual = findDownloadedFile(DIRS.previews, `${previewId}_raw`);
        if (actual && fileExists(actual)) {
          const sizeMB = (fs.statSync(actual).size / 1048576).toFixed(1);
          console.log(`[preview] Download complete: ${actual} (${sizeMB} MB)`);
          resolve(actual);
        } else {
          console.error('[preview] File missing after download. code:', code, 'stderr:', stderr.slice(-500));
          reject(new Error('Preview file not created by yt-dlp'));
        }
      });
    });
  }

  /**
   * Re-encode raw download into a web-optimized, seekable MP4.
   * - Scales to 1280 wide (keeps aspect ratio)
   * - faststart for instant browser playback
   * - AAC audio always preserved
   * - Single thread to avoid laptop overload
   * - NO duration limits — full video preserved
   */
  static async encodePreview(inputPath: string, previewId: string): Promise<string> {
    const outputPath = path.join(DIRS.previews, `${previewId}_encoded.mp4`);

    console.log(`[preview] Encoding HD preview → ${outputPath}`);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-vf scale=1280:-2',
          '-preset veryfast',
          '-crf 21',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-threads 1',
          '-r 24',
          '-b:a 192k',
          '-ac 2',
          '-ar 44100'
        ])
        .toFormat('mp4')
        .on('end', () => {
          if (fileExists(outputPath)) {
            console.log('[preview] HD preview generated');
            resolve(outputPath);
          } else {
            reject(new Error('Encoded preview missing'));
          }
        })
        .on('error', (err) => {
          console.error('[preview] FFmpeg encode error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /** Get video metadata via ffprobe — returns REAL duration, dimensions, codecs */
  static async getVideoMetadata(inputPath: string): Promise<{
    duration: number; width: number; height: number;
    fps: number; codec: string; audioCodec: string;
    bitrate: number; size: number;
  }> {
    const fallback = { duration: 0, width: 0, height: 0, fps: 30, codec: 'unknown', audioCodec: 'unknown', bitrate: 0, size: 0 };

    if (!fileExists(inputPath)) return fallback;

    return new Promise((resolve) => {
      ffmpeg.ffprobe(inputPath, (err, meta) => {
        if (err) {
          console.error('[ffprobe] Error:', err.message);
          const size = fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0;
          return resolve({ ...fallback, size });
        }

        const vs = meta.streams.find(s => s.codec_type === 'video');
        const as_ = meta.streams.find(s => s.codec_type === 'audio');
        let fps = 30;
        if (vs?.r_frame_rate) {
          const [n, d] = vs.r_frame_rate.split('/').map(Number);
          if (d) fps = Math.round(n / d);
        }

        const result = {
          duration: meta.format.duration || 0,
          width: vs?.width || 0,
          height: vs?.height || 0,
          fps,
          codec: vs?.codec_name || 'unknown',
          audioCodec: as_?.codec_name || 'unknown',
          bitrate: meta.format.bit_rate ? Math.round(Number(meta.format.bit_rate) / 1000) : 0,
          size: fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0,
        };

        console.log(`[ffprobe] Duration: ${result.duration}s, ${result.width}x${result.height}, audio: ${result.audioCodec}`);
        resolve(result);
      });
    });
  }

  /** Generate ONE thumbnail from a video file */
  static async generateThumbnail(
    inputPath: string,
    previewId: string,
  ): Promise<Array<{ time: number; url: string }>> {
    if (!fileExists(inputPath)) return [];

    const thumbDir = path.join(DIRS.thumbnails, previewId);
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

    const outputPath = path.join(thumbDir, 'thumb.jpg');

    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vframes', '1',
          '-vf', 'scale=320:-1',
          '-q:v', '5',
          '-threads', '1',
          '-ss', '00:00:01' // Extract a frame at 1 second to avoid blank starting frame
        ])
        .on('end', () => {
          if (fileExists(outputPath)) {
            resolve([{ time: 0, url: `/thumbnails/${previewId}/thumb.jpg` }]);
          } else {
            resolve([]);
          }
        })
        .on('error', () => resolve([])) // Silently fail and return empty on error
        .save(outputPath);
    });
  }

  /**
   * Process clip: trim + format convert from a LOCAL file.
   * NO re-downloading. Uses seekInput for fast seeking + duration for precise trim.
   * Audio always preserved with AAC.
   */
  static processClip(
    inputPath: string,
    outputPath: string,
    format: string,
    startTime?: number,
    endTime?: number
  ): Promise<string> {

    return new Promise((resolve, reject) => {

      // Validate input exists
      if (!fileExists(inputPath)) {
        return reject(new Error(`Input file does not exist: ${inputPath}`));
      }

      // Ensure output directory exists
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      let cmd = ffmpeg(inputPath);

      // Fast input-seeking + precise duration trim
      if (startTime !== undefined && startTime > 0) {
        cmd = cmd.seekInput(startTime);
      }
      if (endTime !== undefined && startTime !== undefined) {
        const dur = endTime - startTime;
        if (dur > 0) {
          cmd = cmd.duration(dur);
        }
      }

      // Common high-quality audio options used by all formats
      const audioOpts = [
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ac', '2',
        '-ar', '44100',
      ];

      // Common high-quality video options
      const videoOpts = [
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '18',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-threads', '1',
      ];

      switch (format) {

        case 'audio':
          cmd = cmd
            .noVideo()
            .toFormat('mp3');
          cmd.outputOptions([
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            '-ac', '2',
            '-ar', '44100',
            '-threads', '1'
          ]);
          break;

        case 'portrait':
          cmd = cmd
            .videoFilter('crop=ih*(9/16):ih')
            .size('1080x1920')
            .toFormat('mp4');
          cmd.outputOptions([...videoOpts, ...audioOpts]);
          break;

        case 'square':
          cmd = cmd
            .videoFilter('crop=ih:ih')
            .size('1080x1080')
            .toFormat('mp4');
          cmd.outputOptions([...videoOpts, ...audioOpts]);
          break;

        default: // landscape
          cmd = cmd.toFormat('mp4');
          cmd.outputOptions([...videoOpts, ...audioOpts]);
          break;
      }

      cmd
        .on('start', (cmdLine) => {
          console.log(`[clip] FFmpeg started: ${cmdLine.slice(0, 200)}`);
        })
        .on('progress', (p) => {
          if (p.percent) {
            process.stdout.write(`\r[clip] Exporting: ${p.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n[clip] Export complete');
          if (fileExists(outputPath)) {
            resolve(outputPath);
          } else {
            reject(new Error('Output file missing after FFmpeg export'));
          }
        })
        .on('error', (err) => {
          console.error('\n[clip] FFmpeg error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Find any existing preview file in the previews directory.
   * Returns the encoded version if available, otherwise the raw download.
   */
  static findExistingPreview(): string | null {
    if (!fs.existsSync(DIRS.previews)) return null;
    const files = fs.readdirSync(DIRS.previews).filter(f => f.endsWith('.mp4'));
    if (files.length === 0) return null;

    // Prefer _encoded files (web-optimized)
    const encoded = files.find(f => f.includes('_encoded'));
    if (encoded) return path.join(DIRS.previews, encoded);

    // Fall back to raw
    const raw = files.find(f => f.includes('_raw'));
    if (raw) return path.join(DIRS.previews, raw);

    return path.join(DIRS.previews, files[0]);
  }

  /** Cleanup old temp/preview files older than maxAgeMs */
  static cleanup(maxAgeMs = 3600000) {
    const now = Date.now();
    [DIRS.temp, DIRS.previews].forEach(dir => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(f => {
        const fp = path.join(dir, f);
        try {
          if (now - fs.statSync(fp).mtimeMs > maxAgeMs) {
            if (fs.statSync(fp).isDirectory()) fs.rmSync(fp, { recursive: true });
            else fs.unlinkSync(fp);
          }
        } catch { /* ignore */ }
      });
    });
  }
}

export { DIRS };
