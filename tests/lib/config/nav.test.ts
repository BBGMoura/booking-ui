import {
  mainNavItems,
  adminNavItems,
  pageTitles,
  getPageTitle,
  isNavItemActive,
} from '@/lib/config/nav';

describe('nav config', () => {
  describe('mainNavItems', () => {
    it('includes Dashboard, Room Calendar and My Bookings', () => {
      const urls = mainNavItems.map((item) => item.url);

      expect(urls).toContain('/dashboard');
      expect(urls).toContain('/calendar');
      expect(urls).toContain('/my-bookings');
    });

    it('every item has a title, url and icon', () => {
      mainNavItems.forEach((item) => {
        expect(item.title).toBeTruthy();
        expect(item.url).toBeTruthy();
        expect(item.icon).toBeTruthy();
      });
    });
  });

  describe('adminNavItems', () => {
    it('includes Users and Classes', () => {
      const urls = adminNavItems.map((item) => item.url);

      expect(urls).toContain('/admin/users');
      expect(urls).not.toContain('/admin/rooms');
      expect(urls).toContain('/admin/classes');
    });

    it('every item has a title, url and icon', () => {
      adminNavItems.forEach((item) => {
        expect(item.title).toBeTruthy();
        expect(item.url).toBeTruthy();
        expect(item.icon).toBeTruthy();
      });
    });
  });

  describe('pageTitles', () => {
    it('contains an entry for every main nav item', () => {
      mainNavItems.forEach((item) => {
        expect(pageTitles[item.url]).toBe(item.title);
      });
    });

    it('contains an entry for every admin nav item', () => {
      adminNavItems.forEach((item) => {
        expect(pageTitles[item.url]).toBe(item.title);
      });
    });

    it('contains an entry for /profile', () => {
      expect(pageTitles['/profile']).toBe('Profile');
    });

    it('does not contain entries for auth routes', () => {
      expect(pageTitles['/login']).toBeUndefined();
      expect(pageTitles['/register']).toBeUndefined();
    });
  });

  describe('getPageTitle', () => {
    it("uses the section's title for a page under it", () => {
      expect(getPageTitle('/admin/users/abc')).toBe('Users');
    });

    it('falls back to Booking Portal for unknown pages', () => {
      expect(getPageTitle('/nowhere')).toBe('Booking Portal');
    });
  });

  describe('isNavItemActive', () => {
    it('is active on the page and on pages under it', () => {
      expect(isNavItemActive('/admin/users', '/admin/users')).toBe(true);
      expect(isNavItemActive('/admin/users/abc', '/admin/users')).toBe(true);
    });

    it('is not active on a page that only shares a prefix', () => {
      expect(isNavItemActive('/admin/users-old', '/admin/users')).toBe(false);
    });
  });
});
