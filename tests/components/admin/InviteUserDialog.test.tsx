import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { inviteUser } from '@/lib/api/user';

jest.mock('@/lib/api/user', () => ({ inviteUser: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockInvite = jest.mocked(inviteUser);

function setup() {
  const onOpenChange = jest.fn();
  const onInvited = jest.fn();
  render(<InviteUserDialog open onOpenChange={onOpenChange} onInvited={onInvited} />);
  return { onOpenChange, onInvited, user: userEvent.setup() };
}

function badRequest(message: string) {
  const error = new AxiosError('Bad request');
  error.response = {
    status: 400,
    data: { status: 400, error: 'INVALID_INVITATION_REQUEST', message },
  } as AxiosError['response'];
  return error;
}

beforeAll(() => {
  // Radix Select uses pointer capture and scrollIntoView, which jsdom doesn't have.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => mockInvite.mockReset());

describe('InviteUserDialog', () => {
  it('rejects an invalid email without calling the API', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it('requires an email', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Send invite' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
  });

  it('invites as User by default, then closes, shows a toast and refreshes the list', async () => {
    mockInvite.mockResolvedValue();
    const { user, onOpenChange, onInvited } = setup();
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    await waitFor(() =>
      expect(mockInvite).toHaveBeenCalledWith({ email: 'jane@example.com', role: 'ROLE_USER' })
    );
    expect(toast.success).toHaveBeenCalledWith('Invite sent to jane@example.com');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onInvited).toHaveBeenCalled();
  });

  it('invites as Admin when Admin is chosen', async () => {
    mockInvite.mockResolvedValue();
    const { user } = setup();
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('combobox', { name: 'Role' }));
    await user.click(await screen.findByRole('option', { name: 'Admin' }));
    expect(screen.getByText('Admins can also use everything under Manage.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    await waitFor(() =>
      expect(mockInvite).toHaveBeenCalledWith({ email: 'jane@example.com', role: 'ROLE_ADMIN' })
    );
  });

  it('shows the "already invited" error on the email field and stays open', async () => {
    mockInvite.mockRejectedValue(
      badRequest('User with email jane@example.com is already invited.')
    );
    const { user, onOpenChange, onInvited } = setup();
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    expect(
      await screen.findByText('User with email jane@example.com is already invited.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onInvited).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => {});
  });
});
