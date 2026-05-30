// Cartoon Engine Worker — Direct processing (no Redis required)
// This module is imported by index.ts to register its existence,
// but all processing is done via direct function calls, not BullMQ workers.

import { CartoonEngineService } from '../services/cartoonEngine.service';

export interface CartoonJobData {
  jobId: string;
  youtubeUrl?: string;
  file?: { path: string; originalname: string; mimetype: string } | null;
  mode: 'url' | 'file' | 'random' | 'prompt';
  style?: string;
  prompt?: string;
}

/**
 * Process a cartoon generation job directly (no Redis/BullMQ needed).
 */
export async function processCartoonJob(
  data: CartoonJobData,
  emitProgress: (step: number, progress: number, message: string) => void
): Promise<string> {
  return CartoonEngineService.processPipeline(
    data.jobId,
    data.youtubeUrl,
    data.file,
    data.mode,
    data.style || 'comedy',
    emitProgress,
    data.prompt
  );
}
