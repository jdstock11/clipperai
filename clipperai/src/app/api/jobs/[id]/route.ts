import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    
    const { id } = await params;
    const res = await fetch(`${backendUrl}/jobs/${id}`, {
      method: 'GET',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Job fetch failed' }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[jobs proxy] Error:', error.message);
    return NextResponse.json({ error: 'Job fetch failed: ' + error.message }, { status: 500 });
  }
}
