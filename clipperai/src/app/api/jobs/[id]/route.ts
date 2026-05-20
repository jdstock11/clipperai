import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    
    const res = await fetch(`${backendUrl}/jobs/${params.id}`, {
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
