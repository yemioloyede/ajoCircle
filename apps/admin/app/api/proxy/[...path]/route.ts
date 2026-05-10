import { NextRequest, NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://ajocircle.onrender.com';

type Ctx = { params: { path: string[] } };

async function forward(req: NextRequest, ctx: Ctx, method: string) {
  const token = req.cookies.get('adminToken')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const qs = req.nextUrl.search || '';
  const joined = (ctx.params.path || []).join('/');
  const url = `${API}/${joined}${qs}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text();
    if (body) headers['Content-Type'] = 'application/json';
  }

  const upstream = await fetch(url, {
    method,
    headers,
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    },
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, 'GET');
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, 'POST');
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, 'PATCH');
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, 'DELETE');
}
