const LOGIN_PATH = '/login';
const PUBLIC_PATHS = ['/login', '/register'];

/**
 * Returns `next` only if it is a path inside this app (e.g. "/calendar?view=week"), otherwise null.
 * Rejects absolute and protocol-relative URLs so the login page can't be used to bounce users to
 * another site.
 */
export function getSafeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return null;
  }
  if (PUBLIC_PATHS.some((path) => next === path || next.startsWith(`${path}?`))) return null;
  return next;
}

/** Builds the login URL for an expired session, remembering the page to return to. */
export function buildLoginPath(currentPath: string): string {
  const next = getSafeNextPath(currentPath);
  return next ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}` : LOGIN_PATH;
}
