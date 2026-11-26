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

/**
 * Leaves the app for the login page with a full page load rather than a client-side navigation.
 * A fresh document drops everything the previous user had loaded, and it can't inherit a
 * `pointer-events: none` left on the body by an overlay (the mobile sidebar sheet, the user menu)
 * that was still open while the login page loaded, which left the login form unclickable.
 */
export function leaveForLogin(): void {
  window.location.replace(LOGIN_PATH);
}
