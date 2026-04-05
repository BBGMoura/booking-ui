import { getInitials } from '@/lib/utils/userUtils';
import { USER_ROLES } from '@/lib/types/auth';

const mockUser = {
  userId: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: USER_ROLES.USER,
};

describe('getInitials', () => {
  it('returns initials from first and last name', () => {
    expect(getInitials(mockUser)).toBe('JD');
  });

  it('returns uppercase initials', () => {
    expect(getInitials({ ...mockUser, firstName: 'jane', lastName: 'doe' })).toBe('JD');
  });

  it('returns ?? when user is null', () => {
    expect(getInitials(null)).toBe('??');
  });
});
