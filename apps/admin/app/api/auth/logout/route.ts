import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  const isHttps = req.url.startsWith('https://');
  res.cookies.set({
    name: 'adminToken',
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps,
    path: '/',
    maxAge: 0,
  });
  return res;
}
