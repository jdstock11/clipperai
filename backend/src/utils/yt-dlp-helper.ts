import path from 'path';
import fs from 'fs';
import YTDlpWrap from 'yt-dlp-wrap';
import os from 'os';

const isWin = process.platform === 'win32';
const ytDlpPath = path.join(__dirname, isWin ? '../../yt-dlp.exe' : '../../yt-dlp');
let ytDlpWrap: YTDlpWrap | null = null;

export function setupCookies(): string | null {
  const cookiePath = path.join(__dirname, '../../cookies.txt');
  if (fs.existsSync(cookiePath)) {
    return cookiePath;
  }
  if (process.env.YOUTUBE_COOKIES) {
    const tempCookiePath = path.join(os.tmpdir(), 'yt_cookies.txt');
    fs.writeFileSync(tempCookiePath, process.env.YOUTUBE_COOKIES);
    return tempCookiePath;
  }
  return null;
}

export function getYtDlpWrap() {
  if (!ytDlpWrap) {
    ytDlpWrap = new YTDlpWrap(ytDlpPath);
  }
  return ytDlpWrap;
}

export function getYtDlpPath() {
  return ytDlpPath;
}

const CLIENT_FALLBACKS = [
  'android',
  'web',
  'mweb',
  'ios'
];

export async function executeYtDlpWithRetry(
  baseArgs: string[],
  timeoutMs: number = 25000,
  maxRetries: number = 2
): Promise<string> {
  const yt = getYtDlpWrap();
  const cookiesPath = setupCookies();
  
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    for (const client of CLIENT_FALLBACKS) {
      const args = [...baseArgs];
      
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
      args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');
      args.push('--add-header', 'Referer:https://www.google.com/');
      args.push('--no-check-certificates');
      args.push('--geo-bypass');
      
      if (cookiesPath) {
        args.push('--cookies', cookiesPath);
      }

      args.push('--extractor-args', `youtube:player_client=${client}`);

      try {
        console.log(`[yt-dlp] Attempt ${attempt + 1}/${maxRetries + 1}, client: ${client}`);
        
        const fetchPromise = yt.execPromise(args);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]) as string;
        return result;

      } catch (error: any) {
        lastError = error;
        
        const isBotError = error.message?.includes('Sign in to confirm') || error.message?.includes('bot');
        
        if (isBotError) {
          console.warn(`[yt-dlp] Bot blocked on client ${client}. Retrying...`);
          continue; 
        }

        if (error.message === 'TIMEOUT') {
          console.warn(`[yt-dlp] Timeout on client ${client}. Retrying...`);
          continue;
        }

        console.warn(`[yt-dlp] Error on client ${client}: ${error.message.substring(0, 100)}...`);
        // If it's a "Video unavailable" or "Private video", break out of the client loop and throw immediately
        if (error.message?.includes('Video unavailable') || error.message?.includes('Private video')) {
             throw new Error('Video is unavailable or private.');
        }
      }
    }
    
    if (attempt < maxRetries) {
      const backoff = Math.pow(2, attempt) * 2000; // 2s, 4s...
      console.log(`[yt-dlp] All clients failed. Waiting ${backoff}ms before next attempt block...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  console.error('[yt-dlp] All retries failed.');
  
  if (lastError?.message?.includes('Sign in to confirm') || lastError?.message?.includes('bot')) {
    throw new Error('YouTube temporarily blocked this video. Try another video.');
  }

  throw new Error(lastError?.message || 'Video fetch failed completely after multiple retries.');
}
