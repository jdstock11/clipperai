import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceUrl, startTime, endTime, userId } = body;

    if (!sourceUrl || startTime === undefined || endTime === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // In a real vercel API we might just push to a queue (like Upstash Kafka/QStash)
    // or trigger an external service. For demo purposes we log to DB.

    const clip = await prisma.clip.create({
      data: {
        userId: userId || 'demo-user-id', // Using dummy for now
        sourceUrl,
        startTime,
        endTime,
        format: 'mp4',
        quality: '1080p',
        status: 'PENDING'
      }
    });

    return NextResponse.json({ 
      clipId: clip.id, 
      message: 'Clip queued for processing' 
    });

  } catch (error) {
    console.error('Error queuing clip:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
