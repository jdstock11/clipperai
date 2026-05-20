import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// Use absolute path of temp
const tmpPath = process.env.VERCEL || process.platform !== 'win32' ? '/tmp' : require('os').tmpdir();
const previewsDir = path.join(tmpPath, 'clipforge_previews');
const uploadsDir = path.join(tmpPath, 'clipforge_uploads');

async function testFilter() {
  let inputFile = '';
  if (fs.existsSync(previewsDir)) {
    const files = fs.readdirSync(previewsDir).filter(f => f.endsWith('.mp4'));
    if (files.length > 0) {
      inputFile = path.join(previewsDir, files[0]);
    }
  }

  if (!inputFile) {
    console.log("No previews found.");
    return;
  }

  const outputFile = path.join(uploadsDir, 'test_cartoon_filter.mp4');
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  
  console.log("Starting filter test on:", inputFile);

  const cmd = ffmpeg(inputFile)
    .outputOptions([
      '-t', '5', // Just test 5 seconds
      '-vf', 'smartblur=lr=2.0:ls=-1.0:lt=0,edgedetect=mode=colormix:high=0',
      '-c:v', 'libx264',
      '-c:a', 'copy',
      '-threads', '1'
    ])
    .on('start', (c) => console.log('Started:', c))
    .on('stderr', (s) => console.log('stderr:', s))
    .on('end', () => console.log('Done:', outputFile))
    .on('error', (err) => console.log('Error:', err.message))
    .save(outputFile);
}

testFilter();
