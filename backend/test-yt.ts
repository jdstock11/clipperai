import { getYtDlpWrap, ensureYtDlpExists } from './src/utils/yt-dlp-helper';
import fs from 'fs';
import os from 'os';

async function test() {
  console.log("os.tmpdir():", os.tmpdir());
  const ytDlpWrap = await getYtDlpWrap();
  console.log("ytDlpWrap instance created.");
  const version = await ytDlpWrap.execPromise(['--version']);
  console.log("Version:", version.trim());
}

test().catch(console.error);
