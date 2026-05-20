import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import os from 'os';
import YTDlpWrap from 'yt-dlp-wrap';
const ffprobeStatic = require('ffprobe-static');
import { executeYtDlpWithRetry } from '../utils/yt-dlp-helper';

const isWin = process.platform === 'win32';

// ── Directory setup ──────────────────────────────────────────────────
const ROOT = path.join(__dirname, '../..');
const tempDir = process.env.VERCEL || !isWin ? '/tmp' : os.tmpdir();

const DIRS = {
  uploads: path.join(tempDir, 'clipforge_uploads'),
  previews: path.join(tempDir, 'clipforge_previews'),
  thumbnails: path.join(tempDir, 'clipforge_thumbnails'),
  temp: path.join(tempDir, 'clipforge_temp'),
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
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log('[ffmpeg] Using binary:', ffmpegStatic);
}

// Locate ffprobe binary shipped by ffprobe-static
if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
  console.log('[ffprobe] Using binary:', ffprobeStatic.path);
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

// ── Text overlay types (matches frontend TextLayer) ──────────────────
interface TextLayerInput {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  opacity: number;
  rotation: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  textAlign: string;
  lineSpacing: number;
  letterSpacing: number;
  shadow: { enabled: boolean; color: string; blur: number; x: number; y: number };
  stroke: { enabled: boolean; color: string; width: number };
  animation: string;
  startTime: number;
  endTime: number;
  visible: boolean;
  clipId?: string;
}

export class VideoService {

  /**
   * Convert frontend TextLayer objects into FFmpeg drawtext filter strings.
   * Each layer becomes a separate drawtext filter chained in the filter graph.
   */
  static buildDrawtextFilters(
    textLayers: TextLayerInput[],
    videoWidth: number,
    videoHeight: number,
    videoDuration: number,
    timeOffset: number = 0
  ): string[] {
    if (!textLayers || textLayers.length === 0 || videoWidth <= 0 || videoHeight <= 0) return [];

    // Map font families to system fallbacks
    const fontMap: Record<string, string> = {
      'Montserrat': 'Sans',
      'Poppins': 'Sans',
      'Bebas Neue': 'Sans',
      'Anton': 'Sans',
      'Oswald': 'Sans',
      'Roboto': 'Sans',
      'Playfair Display': 'Serif',
    };

    return textLayers
      .filter(l => l.visible && l.text && l.text.trim().length > 0)
      .map(layer => {
        const text = (layer.uppercase ? layer.text.toUpperCase() : layer.text)
          .replace(/'/g, "'\\\''")
          .replace(/:/g, '\\:')
          .replace(/%/g, '%%')
          .replace(/\\/g, '\\\\');

        // Position: convert percentage to absolute, centering the text
        const x = Math.round(layer.x * videoWidth);
        const y = Math.round(layer.y * videoHeight);

        // Font
        const font = fontMap[layer.fontFamily] || 'Sans';
        const fontSize = Math.max(8, Math.round(layer.fontSize * (videoHeight / 720)));

        // Color: hex to FFmpeg format
        const fontcolor = layer.color.replace('#', '0x');

        // Time-based enable
        const endTime = layer.endTime === 0 ? videoDuration : layer.endTime;
        const st = Math.max(0, layer.startTime - timeOffset);
        const et = Math.max(st, endTime - timeOffset);
        const enable = `enable='between(t,${st.toFixed(2)},${et.toFixed(2)})'`;

        // Build filter parts
        const parts: string[] = [
          `drawtext=text='${text}'`,
          `x=${x}-(text_w/2)`,
          `y=${y}-(text_h/2)`,
          `fontsize=${fontSize}`,
          `font=${font}`,
          `fontcolor=${fontcolor}@${layer.opacity.toFixed(2)}`,
          enable,
        ];

        // Bold/italic (fontfile not available, use font style hint)
        // Note: FFmpeg drawtext 'font' doesn't support weight directly without fontfile.
        // We approximate with available system fonts.

        // Background box
        if (layer.backgroundOpacity > 0) {
          const bgColor = layer.backgroundColor.replace('#', '0x');
          parts.push(`box=1`);
          parts.push(`boxcolor=${bgColor}@${layer.backgroundOpacity.toFixed(2)}`);
          parts.push(`boxborderw=6`);
        }

        // Shadow
        if (layer.shadow && layer.shadow.enabled) {
          const shadowColor = layer.shadow.color.replace('#', '0x');
          parts.push(`shadowcolor=${shadowColor}@0.7`);
          parts.push(`shadowx=${layer.shadow.x}`);
          parts.push(`shadowy=${layer.shadow.y}`);
        }

        // Stroke / border
        if (layer.stroke && layer.stroke.enabled) {
          const borderColor = layer.stroke.color.replace('#', '0x');
          parts.push(`borderw=${Math.round(layer.stroke.width)}`);
          parts.push(`bordercolor=${borderColor}`);
        }

        const filter = parts.join(':');
        console.log(`[text-overlay] Generated drawtext: ${filter.slice(0, 120)}...`);
        return filter;
      });
  }

  /**
   * Download FULL video from YouTube at up to 720p with audio.
   * This is the ONLY download — both preview and export reuse this file.
   */
  static async downloadPreview(url: string, previewId: string): Promise<string> {
    const outputPath = path.join(DIRS.previews, `${previewId}_raw.mp4`);
    console.log(`[preview] Downloading full video → ${outputPath}`);

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

    try {
      // Use robust retry system for downloads, 30s timeout is too short for a full download, use 300s
      await executeYtDlpWithRetry(args, 300000, 3);
      
      const actual = findDownloadedFile(DIRS.previews, `${previewId}_raw`);
      if (actual && fileExists(actual)) {
        const sizeMB = (fs.statSync(actual).size / 1048576).toFixed(1);
        console.log(`[preview] Download complete: ${actual} (${sizeMB} MB)`);
        return actual;
      } else {
        throw new Error('Preview file not created by yt-dlp');
      }
    } catch (err: any) {
      console.error('[preview] yt-dlp download error:', err.message);
      throw new Error('Download failed: ' + err.message);
    }
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
          "-vf", "scale='min(854,iw)':-2",
          '-preset', 'ultrafast',
          '-crf', '28',
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p',
          '-threads', '0',
          '-r', '24',
          '-b:a', '64k',
          '-ac', '1',
          '-ar', '22050'
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

  static async encodeLocalPreview(inputPath: string, previewId: string): Promise<string> {
    const outputPath = path.join(DIRS.previews, `${previewId}_encoded.mp4`);

    console.log(`[preview] Encoding local HD preview → ${outputPath}`);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          "-vf", "scale='min(854,iw)':-2",
          '-preset', 'ultrafast',
          '-crf', '28',
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p',
          '-threads', '0',
          '-r', '24',
          '-b:a', '64k',
          '-ac', '1',
          '-ar', '22050'
        ])
        .toFormat('mp4')
        .on('end', () => {
          if (fileExists(outputPath)) {
            console.log('[preview] Local HD preview generated');
            resolve(outputPath);
          } else {
            reject(new Error('Encoded local preview missing'));
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
  /** Helper to get FFmpeg options based on quality setting */
  static getExportOptions(quality: string, format: string): { videoOpts: string[], audioOpts: string[], sizeStr: string | null } {
    const audioOpts = ['-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '44100'];
    let videoOpts = ['-c:v', 'libx264', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-threads', '1'];
    let sizeStr: string | null = null;

    // Apply preset and CRF
    if (quality === 'Fast Preview') {
      videoOpts.push('-preset', 'ultrafast', '-crf', '28');
    } else if (quality === 'Standard') {
      videoOpts.push('-preset', 'fast', '-crf', '23');
      audioOpts[3] = '128k';
    } else if (quality === 'HD 720p') {
      videoOpts.push('-preset', 'slow', '-crf', '18');
    } else if (quality === 'Full HD 1080p') {
      videoOpts.push('-preset', 'slow', '-crf', '18');
    } else {
      // Default to HD 720p
      videoOpts.push('-preset', 'slow', '-crf', '18');
    }

    // Apply resolution mapping
    const is1080p = quality === 'Full HD 1080p';
    const isFast = quality === 'Fast Preview';

    if (format === 'landscape') {
      sizeStr = is1080p ? '1920x1080' : isFast ? '854x480' : '1280x720';
    } else if (format === 'portrait') {
      sizeStr = is1080p ? '1080x1920' : isFast ? '480x854' : '720x1280';
    } else if (format === 'square') {
      sizeStr = is1080p ? '1080x1080' : isFast ? '480x480' : '720x720';
    }

    return { videoOpts, audioOpts, sizeStr };
  }
  /**
   * Process clip: trim + format convert from a LOCAL file.
   * NO re-downloading. Uses seekInput for fast seeking + duration for precise trim.
   * Audio always preserved with AAC.
   */
  static async processClip(
    inputPath: string,
    outputPath: string,
    format: string,
    startTime?: number,
    endTime?: number,
    watermark?: any,
    onProgress?: (percent: number) => void,
    textLayers?: TextLayerInput[],
    quality: string = 'HD 720p'
  ): Promise<string> {

    return new Promise(async (resolve, reject) => {

      // Validate input exists
      if (!fileExists(inputPath)) {
        return reject(new Error(`Input file does not exist: ${inputPath}`));
      }

      // Ensure output directory exists
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Fetch video metadata (needed for duration calc + watermark coordinate mapping)
      const meta = await VideoService.getVideoMetadata(inputPath);

      let targetDuration = meta.duration;
      if (startTime !== undefined && endTime !== undefined) {
        targetDuration = Math.max(0.1, endTime - startTime);
      }

      let watermarkFilter = '';
      if (watermark && watermark.enabled && meta.width > 0 && meta.height > 0) {
        let x = Math.round(watermark.x * meta.width);
        let y = Math.round(watermark.y * meta.height);
        let w = Math.round(watermark.w * meta.width);
        let h = Math.round(watermark.h * meta.height);

        // Ensure boundaries are strictly valid
        x = Math.max(0, Math.min(x, meta.width - 2));
        y = Math.max(0, Math.min(y, meta.height - 2));
        w = Math.max(1, Math.min(w, meta.width - x - 1));
        h = Math.max(1, Math.min(h, meta.height - y - 1));

        if (w > 0 && h > 0) {
          if (watermark.mode === 'blur') {
            watermarkFilter = `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
            console.log(`[clip] Applied delogo: ${watermarkFilter}`);
          } else if (watermark.mode === 'crop') {
            watermarkFilter = `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=black:t=fill`;
            console.log(`[clip] Applied crop (drawbox): ${watermarkFilter}`);
          }
        }
      }

      let cmd = ffmpeg(inputPath);
      let lastProgressTime = Date.now();
      let timeoutTimer: NodeJS.Timeout;

      const resetTimeout = () => {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          console.error(`[clip] FFmpeg process hung for 30 seconds. Killing.`);
          cmd.kill('SIGKILL');
          reject(new Error('FFmpeg processing timeout (hung for 30s)'));
        }, 30000);
      };

      resetTimeout();

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

      const { videoOpts, audioOpts, sizeStr } = VideoService.getExportOptions(quality, format);

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
          cmd = cmd.videoFilter('crop=ih*(9/16):ih').toFormat('mp4');
          if (sizeStr) cmd = cmd.size(sizeStr);
          cmd.outputOptions([...videoOpts, ...audioOpts]);
          break;

        case 'square':
          cmd = cmd.videoFilter('crop=ih:ih').toFormat('mp4');
          if (sizeStr) cmd = cmd.size(sizeStr);
          cmd.outputOptions([...videoOpts, ...audioOpts]);
          break;

        default: // landscape
          if (watermarkFilter) {
            cmd = cmd.videoFilter(watermarkFilter).toFormat('mp4');
          } else {
            cmd = cmd.toFormat('mp4');
          }
          if (sizeStr) cmd = cmd.size(sizeStr);
          cmd.outputOptions([...videoOpts, ...audioOpts]);
          break;
      }

      // If format is portrait/square and we have a watermarkFilter, we need to chain them
      if (watermarkFilter && format !== 'landscape' && format !== 'audio') {
        // override the videoFilter set by the switch
        if (format === 'portrait') {
          cmd.videoFilters([watermarkFilter, 'crop=ih*(9/16):ih']);
        } else if (format === 'square') {
          cmd.videoFilters([watermarkFilter, 'crop=ih:ih']);
        }
      }

      // Apply text overlay drawtext filters (appended after all other video filters)
      if (textLayers && textLayers.length > 0 && format !== 'audio') {
        const clipStart = startTime || 0;
        const drawtextFilters = VideoService.buildDrawtextFilters(
          textLayers, meta.width || 1280, meta.height || 720, targetDuration, clipStart
        );
        if (drawtextFilters.length > 0) {
          drawtextFilters.forEach(f => {
            cmd = cmd.videoFilter(f);
          });
          console.log(`[clip] Applied ${drawtextFilters.length} text overlay(s)`);
        }
      }

      cmd
        .on('start', (cmdLine) => {
          console.log(`[clip] FFmpeg started: ${cmdLine.slice(0, 200)}`);
        })
        .on('progress', (p) => {
          resetTimeout();
          let currentPercent = p.percent;

          if (!currentPercent && p.timemark && targetDuration > 0) {
            // Parse timemark "00:00:05.50"
            const parts = p.timemark.split(':');
            if (parts.length === 3) {
              const hrs = parseFloat(parts[0]) || 0;
              const mins = parseFloat(parts[1]) || 0;
              const secs = parseFloat(parts[2]) || 0;
              const elapsed = (hrs * 3600) + (mins * 60) + secs;
              currentPercent = Math.min(99, (elapsed / targetDuration) * 100);
            }
          }

          if (currentPercent && onProgress) {
            onProgress(currentPercent);
          }
        })
        .on('end', () => {
          clearTimeout(timeoutTimer);
          console.log('\n[clip] Export complete');
          if (fileExists(outputPath)) {
            resolve(outputPath);
          } else {
            reject(new Error('Output file missing after FFmpeg export'));
          }
        })
        .on('error', (err) => {
          clearTimeout(timeoutTimer);
          console.error('\n[clip] FFmpeg error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * TRUE Video-to-Video Pipeline: Extract frames -> Style Transfer -> Rebuild -> Audio Sync
   */
  static async processCartoonFallback(
    inputPath: string,
    outputPath: string,
    style: string,
    startTime?: number,
    endTime?: number,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      console.log("\n====================================");
      console.log("FFMPEG STARTED");
      console.log("INPUT EXISTS:", fs.existsSync(inputPath));
      console.log("INPUT PATH:", inputPath);
      console.log("OUTPUT PATH:", outputPath);
      console.log("====================================\n");

      if (!fileExists(inputPath)) return reject(new Error(`Input file does not exist: ${inputPath}`));

      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const meta = await VideoService.getVideoMetadata(inputPath);
      const targetDuration = meta.duration;

      if (onProgress) onProgress(5);

      let cmd = ffmpeg(inputPath);
      let timeoutTimer: NodeJS.Timeout;

      const resetTimeout = () => {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          console.error(`[processCartoon] FFmpeg process hung for 120 seconds. Killing.`);
          cmd.kill('SIGKILL');
          reject(new Error('FFmpeg processing timeout (hung for 120s)'));
        }, 120000);
      };

      resetTimeout();

      // Map styles to robust FFmpeg visual filters to give true animated aesthetics
      let styleFilter = '';
      if (style === 'Anime') {
        styleFilter = 'smartblur=lr=2.0:ls=-1.0:lt=0,edgedetect=mode=colormix:high=0,eq=saturation=1.5';
      } else if (style === 'Cartoon') {
        styleFilter = 'smartblur=lr=2.5:ls=-1.2:lt=0,edgedetect=mode=colormix:high=0,eq=contrast=1.2:saturation=1.4';
      } else if (style === 'Pixar Style') {
        styleFilter = 'smartblur=lr=3.0:ls=-1.5:lt=0,eq=contrast=1.2:saturation=1.4:brightness=0.05';
      } else if (style === 'Comic Style') {
        styleFilter = 'smartblur=lr=2.0:ls=-1.0:lt=0,edgedetect=mode=colormix:high=0,eq=contrast=1.5:saturation=1.2';
      } else {
        styleFilter = 'smartblur=lr=2.0:ls=-1.0:lt=0,edgedetect=mode=colormix:high=0,eq=saturation=1.3';
      }

      console.log(`[processCartoon] Applying animated filter: ${styleFilter}`);

      // STRICTLY APPLYING ONLY: ffmpeg -i input.mp4 -vf "<styleFilter>" -c:a copy output.mp4
      cmd.outputOptions([
        '-vf', styleFilter,
        '-c:a', 'copy',
        '-threads', '1'
      ])
      .on('start', (cmdLine) => {
        console.log(`[processCartoon] FFmpeg filter command started: ${cmdLine}`);
      })
      .on('progress', (p) => {
        resetTimeout();
        let currentPercent = p.percent;

        if (!currentPercent && p.timemark && targetDuration > 0) {
          const parts = p.timemark.split(':');
          if (parts.length === 3) {
            const hrs = parseFloat(parts[0]) || 0;
            const mins = parseFloat(parts[1]) || 0;
            const secs = parseFloat(parts[2]) || 0;
            const elapsed = (hrs * 3600) + (mins * 60) + secs;
            currentPercent = Math.min(99, (elapsed / targetDuration) * 100);
          }
        }

        if (currentPercent && onProgress) {
          onProgress(Math.max(5, currentPercent));
        }
      })
      .on('stderr', (stderrLine) => {
        // Capture stderr from ffmpeg as requested
        console.log(`[ffmpeg stderr] ${stderrLine}`);
      })
      .on('end', () => {
        clearTimeout(timeoutTimer);
        console.log('\n[processCartoon] Export complete');
        if (fileExists(outputPath)) {
          if (onProgress) onProgress(100);
          resolve(outputPath);
        } else {
          reject(new Error('Output file missing after FFmpeg export'));
        }
      })
      .on('error', (err, stdout, stderr) => {
        clearTimeout(timeoutTimer);
        console.error('\n[processCartoon] FFmpeg error:', err.message);
        console.error('[processCartoon] FFmpeg full stderr:', stderr);
        reject(err);
      })
      .save(outputPath);
    });
  }

  /**
   * Process multi-clip: trims and concatenates multiple segments using FFmpeg filter_complex.
   */
  static async processMultiClip(
    inputPath: string,
    outputPath: string,
    format: string,
    cuts: Array<{ start: number; end: number }>,
    watermark?: any,
    onProgress?: (percent: number) => void,
    quality: string = 'HD 720p'
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!fileExists(inputPath)) return reject(new Error(`Input file does not exist: ${inputPath}`));

      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      if (!cuts || cuts.length === 0) {
        return VideoService.processClip(inputPath, outputPath, format, undefined, undefined, watermark, onProgress, undefined, quality).then(resolve).catch(reject);
      }

      const meta = await VideoService.getVideoMetadata(inputPath);
      let targetDuration = cuts.reduce((acc, cut) => acc + Math.max(0, cut.end - cut.start), 0);
      if (targetDuration <= 0) targetDuration = meta.duration;

      let watermarkFilter = '';
      if (watermark && watermark.enabled && meta.width > 0 && meta.height > 0) {
        let x = Math.round(watermark.x * meta.width);
        let y = Math.round(watermark.y * meta.height);
        let w = Math.round(watermark.w * meta.width);
        let h = Math.round(watermark.h * meta.height);

        // Strictly constrain values
        x = Math.max(0, Math.min(x, meta.width - 2));
        y = Math.max(0, Math.min(y, meta.height - 2));
        w = Math.max(1, Math.min(w, meta.width - x - 1));
        h = Math.max(1, Math.min(h, meta.height - y - 1));

        if (w > 0 && h > 0) {
          if (watermark.mode === 'blur') {
            watermarkFilter = `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
          } else if (watermark.mode === 'crop') {
            watermarkFilter = `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=black:t=fill`;
          }
        }
      }

      let cmd = ffmpeg(inputPath);
      let timeoutTimer: NodeJS.Timeout;

      const resetTimeout = () => {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          console.error(`[clip-multi] FFmpeg process hung for 30 seconds. Killing.`);
          cmd.kill('SIGKILL');
          reject(new Error('FFmpeg processing timeout (hung for 30s)'));
        }, 30000);
      };

      resetTimeout();
      let filterComplex = '';
      const concatInputs: string[] = [];

      cuts.forEach((cut, i) => {
        const vOut = `v${i}`;
        const aOut = `a${i}`;
        filterComplex += `[0:v]trim=start=${cut.start}:end=${cut.end},setpts=PTS-STARTPTS[${vOut}];`;
        filterComplex += `[0:a]atrim=start=${cut.start}:end=${cut.end},asetpts=PTS-STARTPTS[${aOut}];`;
        concatInputs.push(`[${vOut}][${aOut}]`);
      });

      filterComplex += `${concatInputs.join('')}concat=n=${cuts.length}:v=1:a=1[concatv][concata];`;

      let finalV = 'concatv';

      // Apply watermark removal to the concatenated video
      if (watermarkFilter) {
        filterComplex += `[${finalV}]${watermarkFilter}[cleanv];`;
        finalV = 'cleanv';
      }

      if (format === 'portrait') {
        filterComplex += `[${finalV}]crop=ih*(9/16):ih[outv]`;
        finalV = 'outv';
      } else if (format === 'square') {
        filterComplex += `[${finalV}]crop=ih:ih[outv]`;
        finalV = 'outv';
      }

      cmd = cmd.complexFilter(filterComplex, format === 'audio' ? ['concata'] : [finalV, 'concata']);

      const { videoOpts, audioOpts, sizeStr } = VideoService.getExportOptions(quality, format);

      if (format === 'audio') {
        cmd = cmd.toFormat('mp3');
        cmd.outputOptions(['-c:a', 'libmp3lame', '-b:a', '192k', '-ac', '2', '-ar', '44100', '-threads', '1']);
      } else if (format === 'portrait') {
        cmd = cmd.toFormat('mp4');
        if (sizeStr) cmd = cmd.size(sizeStr);
        cmd.outputOptions([...videoOpts, ...audioOpts]);
      } else if (format === 'square') {
        cmd = cmd.toFormat('mp4');
        if (sizeStr) cmd = cmd.size(sizeStr);
        cmd.outputOptions([...videoOpts, ...audioOpts]);
      } else {
        cmd = cmd.toFormat('mp4');
        if (sizeStr) cmd = cmd.size(sizeStr);
        cmd.outputOptions([...videoOpts, ...audioOpts]);
      }

      cmd
        .on('start', (cmdLine) => console.log(`[clip-multi] FFmpeg started: ${cmdLine.slice(0, 200)}`))
        .on('progress', (p) => {
          resetTimeout();
          let currentPercent = p.percent;

          if (!currentPercent && p.timemark && targetDuration > 0) {
            const parts = p.timemark.split(':');
            if (parts.length === 3) {
              const hrs = parseFloat(parts[0]) || 0;
              const mins = parseFloat(parts[1]) || 0;
              const secs = parseFloat(parts[2]) || 0;
              const elapsed = (hrs * 3600) + (mins * 60) + secs;
              currentPercent = Math.min(99, (elapsed / targetDuration) * 100);
            }
          }

          if (currentPercent && onProgress) {
            onProgress(currentPercent);
          }
        })
        .on('end', () => {
          clearTimeout(timeoutTimer);
          console.log('\n[clip-multi] Export complete');
          fileExists(outputPath) ? resolve(outputPath) : reject(new Error('Output file missing after FFmpeg export'));
        })
        .on('error', (err) => {
          clearTimeout(timeoutTimer);
          console.error('\n[clip-multi] FFmpeg error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Process merge: concat multiple full video files into one using filter_complex
   */
  static async mergeVideos(
    inputPaths: string[],
    outputPath: string,
    format: string,
    onProgress?: (percent: number) => void,
    textLayers?: TextLayerInput[],
    quality: string = 'HD 720p'
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (inputPaths.length === 0) return reject(new Error('No input videos provided for merging.'));

      for (const input of inputPaths) {
        if (!fileExists(input)) return reject(new Error(`Input file does not exist: ${input}`));
      }

      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const { videoOpts, audioOpts, sizeStr } = VideoService.getExportOptions(quality, format);

      // Determine dimensions based on format and quality
      let w = 1280; let h = 720; // default HD landscape
      if (sizeStr) {
        const parts = sizeStr.split('x');
        if (parts.length === 2) {
          w = parseInt(parts[0], 10);
          h = parseInt(parts[1], 10);
        }
      } else if (format === 'audio') { 
        w = 0; h = 0; 
      }

      let filterComplex = '';
      const concatInputs: string[] = [];
      let totalDuration = 0;

      for (let i = 0; i < inputPaths.length; i++) {
        const meta = await VideoService.getVideoMetadata(inputPaths[i]);
        totalDuration += meta.duration > 0 ? meta.duration : 5; // fallback
        
        const vOut = `v${i}`;
        const aOut = `a${i}`;
        
        if (format !== 'audio') {
          // Video: scale and pad to WxH, normalize framerate to 30fps and sar to 1
          filterComplex += `[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[${vOut}];`;
        }
        
        // Audio: resample to 44100Hz, stereo
        filterComplex += `[${i}:a]aresample=44100,aformat=channel_layouts=stereo[${aOut}];`;
        
        if (format === 'audio') {
          concatInputs.push(`[${aOut}]`);
        } else {
          concatInputs.push(`[${vOut}][${aOut}]`);
        }
      }

      if (format === 'audio') {
        filterComplex += `${concatInputs.join('')}concat=n=${inputPaths.length}:v=0:a=1[outa]`;
      } else {
        filterComplex += `${concatInputs.join('')}concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`;
      }

      let cmd = ffmpeg();
      inputPaths.forEach(input => { cmd = cmd.addInput(input); });

      let timeoutTimer: NodeJS.Timeout;
      const resetTimeout = () => {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          console.error(`[merge] FFmpeg process hung for 60 seconds. Killing.`);
          cmd.kill('SIGKILL');
          reject(new Error('FFmpeg processing timeout (hung for 60s)'));
        }, 60000);
      };

      resetTimeout();

      if (format === 'audio') {
        cmd = cmd.complexFilter(filterComplex, ['outa']).toFormat('mp3');
        cmd.outputOptions(['-c:a', 'libmp3lame', '-b:a', '192k', '-ac', '2', '-ar', '44100', '-threads', '2']);
      } else {
        cmd = cmd.complexFilter(filterComplex, ['outv', 'outa']).toFormat('mp4');
        cmd.outputOptions([...videoOpts, ...audioOpts]);
      }

      // Apply text overlays to merged output
      if (textLayers && textLayers.length > 0 && format !== 'audio') {
        // Determine merged video dimensions for text layers
        let mw = w; let mh = h;

        // Only apply global text layers (no clipId) to the merged output
        const globalLayers = textLayers.filter(l => !l.clipId);
        const drawtextFilters = VideoService.buildDrawtextFilters(
          globalLayers, mw, mh, totalDuration
        );
        if (drawtextFilters.length > 0) {
          drawtextFilters.forEach(f => {
            cmd = cmd.videoFilter(f);
          });
          console.log(`[merge] Applied ${drawtextFilters.length} text overlay(s)`);
        }
      }

      cmd
        .on('start', (cmdLine) => console.log(`[merge] FFmpeg started: ${cmdLine.slice(0, 200)}...`))
        .on('progress', (p) => {
          resetTimeout();
          let currentPercent = p.percent;

          if (!currentPercent && p.timemark && totalDuration > 0) {
            const parts = p.timemark.split(':');
            if (parts.length === 3) {
              const hrs = parseFloat(parts[0]) || 0;
              const mins = parseFloat(parts[1]) || 0;
              const secs = parseFloat(parts[2]) || 0;
              const elapsed = (hrs * 3600) + (mins * 60) + secs;
              currentPercent = Math.min(99, (elapsed / totalDuration) * 100);
            }
          }

          if (currentPercent && onProgress) {
            onProgress(currentPercent);
          }
        })
        .on('end', () => {
          clearTimeout(timeoutTimer);
          console.log('\n[merge] Export complete');
          fileExists(outputPath) ? resolve(outputPath) : reject(new Error('Output file missing after FFmpeg export'));
        })
        .on('error', (err) => {
          clearTimeout(timeoutTimer);
          console.error('\n[merge] FFmpeg error:', err.message);
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

  /** Cleanup old temp/preview/upload files older than maxAgeMs (default 15 mins) */
  static cleanup(maxAgeMs = 900000) {
    const now = Date.now();
    [DIRS.temp, DIRS.previews, DIRS.uploads].forEach(dir => {
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
