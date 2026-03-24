import { NextRequest, NextResponse } from 'next/server';

/**
 * Injects the Authorization header for API requests server-side so that
 * the auth token is never shipped to the browser.
 * The token is read from the server-only AUTH_STUB_SECRET env var.
 */
export function middleware(request: NextRequest) {
  const authSecret = process.env.AUTH_STUB_SECRET;
  if (!authSecret) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Authorization', `Bearer ${authSecret}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/:path*',
};
