import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    // Forward the raw body + content-type header to preserve multipart boundaries
    const contentType = request.headers.get('content-type') || '';
    const body = await request.arrayBuffer();

    const res = await fetch(`${backendUrl}/upload-video`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: Buffer.from(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[upload-proxy] Error:', error.message);
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
  }
}
