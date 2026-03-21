// Route definitions

const PUBLIC_ROUTES = ['/login', '/register'];

const PROTECTED_ROUTES = ['/dashboard', '/bookings', '/booking-history', '/profile', '/admin'];

/**
 * Decodes the payload of a JWT token without verifying the signature.
 * We only use this to read the role for routing decisions.
 * Spring Boot verifies the signature on every API call — that is the real security layer.
 */
function decodeJWT(token: string): { role?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Determines where to redirect based on the current path and auth token.
 * Returns a redirect path string if a redirect is needed, or null to let the request through.
 *
 * Scenarios:
 * - No token + protected route → /login
 * - No token + root → /login
 * - Has token + public route → /dashboard
 * - Has token + root → /dashboard
 * - Has token + admin route + not admin role → /dashboard
 * - Everything else → null (let through)
 */
export function getRedirectPath(pathname: string, token: string | null): string | null {
  const payload = token ? decodeJWT(token) : null;
  const isAuthenticated = !!payload;
  const isAdmin = payload?.role === 'ROLE_ADMIN';

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');
  const isRootRoute = pathname === '/';

  if (isRootRoute) return isAuthenticated ? '/dashboard' : '/login';
  if (isAuthenticated && isPublicRoute) return '/dashboard';
  if (!isAuthenticated && isProtectedRoute) return '/login';
  if (isAuthenticated && isAdminRoute && !isAdmin) return '/dashboard';

  return null;
}
