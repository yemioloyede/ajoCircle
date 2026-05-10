import { NextRequest, NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://ajocircle.onrender.com';

function decodePayload(token: string): any | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.token) {
    return NextResponse.json({ error: j.error || 'Login failed' }, { status: r.status || 401 });
  }

  const payload = decodePayload(j.token);
  const adminRoles = ['COMPLIANCE_ADMIN', 'SUPER_ADMIN'];
  if (!payload?.role || !adminRoles.includes(payload.role)) {
    return NextResponse.json({ error: 'Access denied: insufficient permissions' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: 'adminToken',
    value: j.token,
    httpOnly: true,
    sameSite: 'strict',
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return res;
}
