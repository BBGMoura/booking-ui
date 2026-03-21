import { getRedirectPath } from '@/lib/utils/proxyUtils';

// USER payload decodes to:  { "role": "ROLE_USER" }
// ADMIN payload decodes to: { "role": "ROLE_ADMIN" }
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjogIlJPTEVfVVNFUiJ9.sig';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjogIlJPTEVfQURNSU4ifQ.sig';

describe('getRedirectPath', () => {
  describe('unauthenticated user (no token)', () => {
    it('redirects / to /login', () => {
      expect(getRedirectPath('/', null)).toBe('/login');
    });

    it('redirects /dashboard to /login', () => {
      expect(getRedirectPath('/dashboard', null)).toBe('/login');
    });

    it('redirects /bookings to /login', () => {
      expect(getRedirectPath('/bookings', null)).toBe('/login');
    });

    it('redirects /booking-history to /login', () => {
      expect(getRedirectPath('/booking-history', null)).toBe('/login');
    });

    it('redirects /profile to /login', () => {
      expect(getRedirectPath('/profile', null)).toBe('/login');
    });

    it('redirects /admin to /login', () => {
      expect(getRedirectPath('/admin', null)).toBe('/login');
    });

    it('redirects /admin/users to /login', () => {
      expect(getRedirectPath('/admin/users', null)).toBe('/login');
    });

    it('allows /login through', () => {
      expect(getRedirectPath('/login', null)).toBeNull();
    });

    it('allows /register through', () => {
      expect(getRedirectPath('/register', null)).toBeNull();
    });
  });

  describe('authenticated regular user', () => {
    it('redirects / to /dashboard', () => {
      expect(getRedirectPath('/', USER_TOKEN)).toBe('/dashboard');
    });

    it('redirects /login to /dashboard', () => {
      expect(getRedirectPath('/login', USER_TOKEN)).toBe('/dashboard');
    });

    it('redirects /register to /dashboard', () => {
      expect(getRedirectPath('/register', USER_TOKEN)).toBe('/dashboard');
    });

    it('allows /dashboard through', () => {
      expect(getRedirectPath('/dashboard', USER_TOKEN)).toBeNull();
    });

    it('allows /bookings through', () => {
      expect(getRedirectPath('/bookings', USER_TOKEN)).toBeNull();
    });

    it('allows /booking-history through', () => {
      expect(getRedirectPath('/booking-history', USER_TOKEN)).toBeNull();
    });

    it('allows /profile through', () => {
      expect(getRedirectPath('/profile', USER_TOKEN)).toBeNull();
    });

    it('redirects /admin to /dashboard', () => {
      expect(getRedirectPath('/admin', USER_TOKEN)).toBe('/dashboard');
    });

    it('redirects /admin/users to /dashboard', () => {
      expect(getRedirectPath('/admin/users', USER_TOKEN)).toBe('/dashboard');
    });

    it('redirects /admin/rooms to /dashboard', () => {
      expect(getRedirectPath('/admin/rooms', USER_TOKEN)).toBe('/dashboard');
    });
  });

  describe('authenticated admin user', () => {
    it('redirects / to /dashboard', () => {
      expect(getRedirectPath('/', ADMIN_TOKEN)).toBe('/dashboard');
    });

    it('redirects /login to /dashboard', () => {
      expect(getRedirectPath('/login', ADMIN_TOKEN)).toBe('/dashboard');
    });

    it('allows /dashboard through', () => {
      expect(getRedirectPath('/dashboard', ADMIN_TOKEN)).toBeNull();
    });

    it('allows /admin through', () => {
      expect(getRedirectPath('/admin', ADMIN_TOKEN)).toBeNull();
    });

    it('allows /admin/users through', () => {
      expect(getRedirectPath('/admin/users', ADMIN_TOKEN)).toBeNull();
    });

    it('allows /admin/rooms through', () => {
      expect(getRedirectPath('/admin/rooms', ADMIN_TOKEN)).toBeNull();
    });

    it('allows /admin/classes through', () => {
      expect(getRedirectPath('/admin/classes', ADMIN_TOKEN)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('treats a malformed token as unauthenticated', () => {
      expect(getRedirectPath('/dashboard', 'not-a-valid-jwt')).toBe('/login');
    });

    it('treats an empty string token as unauthenticated', () => {
      expect(getRedirectPath('/dashboard', '')).toBe('/login');
    });
  });
});
