import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersList } from '@/components/admin/UsersList';
import { getUsers } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';

jest.mock('@/lib/api/user', () => ({ getUsers: jest.fn(), inviteUser: jest.fn() }));
const mockGetUsers = jest.mocked(getUsers);

const user = (over: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'u1',
  firstName: 'Jane',
  lastName: 'Cooper',
  email: 'jane@example.com',
  phoneNumber: '07123456789',
  enabled: true,
  role: 'ROLE_USER',
  ...over,
});

const pageOf = (content: UserProfile[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});

beforeEach(() => mockGetUsers.mockReset());

describe('UsersList', () => {
  it('lists users with Admin badge, status, and a link to the details page', async () => {
    mockGetUsers.mockResolvedValue(
      pageOf([
        user({ role: 'ROLE_ADMIN' }),
        user({
          uid: 'u2',
          firstName: 'Bo',
          lastName: 'Lee',
          email: 'bo@example.com',
          enabled: false,
        }),
        user({
          uid: 'u3',
          firstName: null,
          lastName: null,
          email: 'new@example.com',
          phoneNumber: null,
          enabled: false,
        }),
      ])
    );
    render(<UsersList />);

    const rows = await screen.findAllByRole('row');
    expect(within(rows[1]).getByText('Admin')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Active')).toBeInTheDocument();
    expect(within(rows[1]).getByRole('link', { name: 'Jane Cooper' })).toHaveAttribute(
      'href',
      '/admin/users/u1'
    );
    expect(within(rows[2]).queryByText('Admin')).not.toBeInTheDocument();
    expect(within(rows[2]).getByText('Disabled')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Invited')).toBeInTheDocument();
  });

  it('shows a message when a search has no results', async () => {
    mockGetUsers.mockResolvedValueOnce(pageOf([user()]));
    mockGetUsers.mockResolvedValue(pageOf([]));
    const u = userEvent.setup();
    render(<UsersList />);
    await screen.findByText('Jane Cooper');

    await u.type(screen.getByLabelText('Search users'), 'cooper');
    expect(await screen.findByText("No users match 'cooper'")).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    mockGetUsers.mockRejectedValueOnce(new Error('boom'));
    mockGetUsers.mockResolvedValue(pageOf([user()]));
    const u = userEvent.setup();
    render(<UsersList />);

    await screen.findByRole('alert');
    await u.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Jane Cooper')).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    mockGetUsers.mockResolvedValue(pageOf([]));
    render(<UsersList />);
    expect(await screen.findByText('No users yet')).toBeInTheDocument();
  });
});
