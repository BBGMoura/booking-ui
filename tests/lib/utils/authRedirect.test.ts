import { buildLoginPath, getSafeNextPath } from '@/lib/utils/authRedirect';

describe('getSafeNextPath', () => {
  it('accepts in-app paths with a query string', () => {
    expect(getSafeNextPath('/calendar?view=week')).toBe('/calendar?view=week');
  });

  it.each([
    null,
    undefined,
    '',
    'calendar',
    '//evil.example.com',
    '/\\evil.example.com',
    'https://evil.example.com',
  ])('rejects %p', (value) => {
    expect(getSafeNextPath(value)).toBeNull();
  });

  it('rejects login and register so the user is not sent back to them', () => {
    expect(getSafeNextPath('/login')).toBeNull();
    expect(getSafeNextPath('/register?x=1')).toBeNull();
  });
});

describe('buildLoginPath', () => {
  it('keeps the current page as an encoded next param', () => {
    expect(buildLoginPath('/my-bookings?page=2')).toBe('/login?next=%2Fmy-bookings%3Fpage%3D2');
  });

  it('returns plain /login when there is no page worth returning to', () => {
    expect(buildLoginPath('/login')).toBe('/login');
    expect(buildLoginPath('/')).toBe('/login?next=%2F');
  });
});
