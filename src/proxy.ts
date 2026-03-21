import { NextRequest, NextResponse } from 'next/server';
import { getRedirectPath } from '@/lib/utils/proxyUtils';

/**
 * Runs on the server before every page request.
 * Reads the auth cookie and delegates routing decisions to getRedirectPath.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value ?? null;
  const redirectPath = getRedirectPath(request.nextUrl.pathname, token);

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

/**
 * Tells Next.js which routes to run the proxy function on.
 * Excludes Next.js internals and static files so the proxy only runs
 * on actual page navigations — not on every image or CSS file request.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
