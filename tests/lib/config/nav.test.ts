import { mainNavItems, adminNavItems, pageTitles } from '@/lib/config/nav';

describe('nav config', () => {
  describe('mainNavItems', () => {
    it('includes Dashboard, Bookings and Booking History', () => {
      const urls = mainNavItems.map((item) => item.url);

      expect(urls).toContain('/dashboard');
      expect(urls).toContain('/bookings');
      expect(urls).toContain('/booking-history');
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
    it('includes Users, Rooms and Classes', () => {
      const urls = adminNavItems.map((item) => item.url);

      expect(urls).toContain('/admin/users');
      expect(urls).toContain('/admin/rooms');
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
});
