import { NextRequest, NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://ajocircle.onrender.com';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${API}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const j = await r.json().catch(() => ({}));
  return NextResponse.json(j, { status: r.status });
}
