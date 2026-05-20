import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    const { id } = await params;
    
    const res = await fetch(`${backendUrl}/cartoon-jobs/${id}`, {
      method: 'GET',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Cartoon job fetch failed' }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[cartoon-jobs proxy] Error:', error.message);
    return NextResponse.json({ error: 'Cartoon job fetch failed: ' + error.message }, { status: 500 });
  }
}
