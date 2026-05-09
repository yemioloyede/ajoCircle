import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('adminToken')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Decode JWT payload (no signature verify — trust the backend to reject invalid tokens)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const adminRoles = ['COMPLIANCE_ADMIN', 'SUPER_ADMIN'];
    if (!payload.role || !adminRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
