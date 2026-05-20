import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    const body = await request.json();

    const res = await fetch(`${backendUrl}/generate-cartoon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Generation initiation failed' }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[generate-cartoon proxy] Error:', error.message);
    return NextResponse.json({ error: 'Generation failed: ' + error.message }, { status: 500 });
  }
}
