import { getUserDisplayName, getUserInitials, getUserStatus } from '@/lib/utils/userStatus';

describe('getUserStatus', () => {
  it('is Invited when there is no first or last name', () => {
    expect(getUserStatus({ firstName: null, lastName: null, enabled: false })).toBe('Invited');
    expect(getUserStatus({ firstName: '', lastName: '', enabled: false })).toBe('Invited');
  });

  it('is Active for a registered, enabled user', () => {
    expect(getUserStatus({ firstName: 'Jane', lastName: 'Cooper', enabled: true })).toBe('Active');
  });

  it('is Disabled for a registered user who is not enabled', () => {
    expect(getUserStatus({ firstName: 'Jane', lastName: 'Cooper', enabled: false })).toBe(
      'Disabled'
    );
  });
});

describe('getUserDisplayName', () => {
  it('joins first and last name', () => {
    expect(
      getUserDisplayName({ firstName: 'Jane', lastName: 'Cooper', email: 'j@example.com' })
    ).toBe('Jane Cooper');
  });

  it('shows the email for an invited user', () => {
    expect(getUserDisplayName({ firstName: null, lastName: null, email: 'j@example.com' })).toBe(
      'j@example.com'
    );
  });
});

describe('getUserInitials', () => {
  it('uses the first letters of the first and last name', () => {
    expect(getUserInitials({ firstName: 'jane', lastName: 'Cooper', email: 'j@example.com' })).toBe(
      'JC'
    );
  });

  it('uses the email for an invited user', () => {
    expect(getUserInitials({ firstName: null, lastName: null, email: 'new@example.com' })).toBe(
      'N'
    );
  });
});
