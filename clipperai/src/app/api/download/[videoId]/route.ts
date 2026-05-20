import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  try {
    const { videoId } = await params;
    // Mock backend streaming download:
    // In production, we'd locate the file: /temp/renders/{videoId}.mp4
    // And stream it to the client.
    
    // For this mockup, we will fetch a stable dummy video and pipe it to the response
    const videoResponse = await fetch("https://www.w3schools.com/html/mov_bbb.mp4");
    
    if (!videoResponse.ok) {
      throw new Error("Failed to fetch dummy video stream");
    }

    // Stream the file back to the client securely with correct headers
    return new NextResponse(videoResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="clipforge-export-${videoId}.mp4"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
  }
}
