import { isValidRole, getAllRoles, USER_ROLES } from '@/lib/types/auth';

describe('Auth Type Helpers', () => {
  describe('isValidRole', () => {
    it('should return true for ROLE_ADMIN', () => {
      expect(isValidRole('ROLE_ADMIN')).toBe(true);
    });

    it('should return true for ROLE_USER', () => {
      expect(isValidRole('ROLE_USER')).toBe(true);
    });

    it('should return false for invalid role string', () => {
      expect(isValidRole('INVALID_ROLE')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidRole('')).toBe(false);
    });

    it('should return false for null', () => {
      // @ts-expect-error - Testing invalid input type
      expect(isValidRole(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // @ts-expect-error - Testing invalid input type
      expect(isValidRole(undefined)).toBe(false);
    });
  });

  describe('getAllRoles', () => {
    it('should return array of all roles', () => {
      const roles = getAllRoles();
      expect(roles).toEqual(['ROLE_ADMIN', 'ROLE_USER']);
    });

    it('should return array with length 2', () => {
      expect(getAllRoles()).toHaveLength(2);
    });

    it('should return roles that match USER_ROLES values', () => {
      const roles = getAllRoles();
      expect(roles).toContain(USER_ROLES.ADMIN);
      expect(roles).toContain(USER_ROLES.USER);
    });
  });

  describe('USER_ROLES constant', () => {
    it('should have ADMIN property', () => {
      expect(USER_ROLES.ADMIN).toBe('ROLE_ADMIN');
    });

    it('should have USER property', () => {
      expect(USER_ROLES.USER).toBe('ROLE_USER');
    });
  });
});
