import { CartoonService } from './services/cartoon.service';
import fs from 'fs';
import path from 'path';

// Use absolute path of temp
const tmpPath = process.env.VERCEL || process.platform !== 'win32' ? '/tmp' : require('os').tmpdir();
const previewsDir = path.join(tmpPath, 'clipforge_previews');
const uploadsDir = path.join(tmpPath, 'clipforge_uploads');

async function test() {
  let inputFile = '';
  if (fs.existsSync(previewsDir)) {
    const files = fs.readdirSync(previewsDir).filter(f => f.endsWith('.mp4'));
    if (files.length > 0) {
      inputFile = path.join(previewsDir, files[0]);
    }
  }

  if (!inputFile) {
    console.log("No previews found to test with.");
    return;
  }

  const outputFile = path.join(uploadsDir, 'test_output.mp4');
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  
  console.log("Starting test render with:", inputFile);
  try {
    const res = await CartoonService.processCartoonAI(inputFile, outputFile, 'Anime', 0, 10, (p: number) => {
      console.log(`Progress: ${p}%`);
    });
    console.log("Test render successful:", res);
  } catch (err) {
    console.error("Test render failed:", err);
  }
}

test();
