import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'cb_access_token';

/** Public paths that don't require authentication */
const PUBLIC_PATHS = ['/', '/login', '/reset-password', '/terms', '/privacy', '/docs', '/support'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  // API proxy — forward auth header
  if (pathname.startsWith('/api/')) {
    if (!accessToken) return NextResponse.next();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Static / internal Next.js paths — skip
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Public pages — allow through, but redirect to dashboard if already logged in
  if (isPublicPath(pathname)) {
    if (accessToken && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected pages — redirect to login if no access token
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
