import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { SettingsForm } from '@/components/admin/SettingsForm';
import * as settingsApi from '@/lib/api/settings';
import type { StudioSettings } from '@/lib/types/settings';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/api/settings');
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockGet = settingsApi.getStudioSettings as jest.MockedFunction<
  typeof settingsApi.getStudioSettings
>;
const mockUpdate = settingsApi.updateStudioSettings as jest.MockedFunction<
  typeof settingsApi.updateStudioSettings
>;

const settings: StudioSettings = {
  studioName: 'ACS Dance Studio',
  recurringMaxDates: 12,
  recurringMaxActive: 3,
  sharedRoomMax: 3,
  sharedDiscountPerHour: 1.5,
  cancellationWindowHours: 24,
  paymentDueDays: 14,
  billingDay: 1,
  invoicePrefix: 'ACS',
  businessName: 'ACS Ltd',
  businessAddress: '1 High Street',
  bankAccountName: 'ACS Ltd',
  bankSortCode: '123456',
  bankAccountNumber: '12345678',
  updatedAt: '2026-01-01T00:00:00Z',
};

function apiError(status: number, message: string) {
  return new AxiosError('failed', 'ERR', undefined, undefined, {
    status,
    data: { message },
  } as never);
}

async function renderLoaded() {
  render(<SettingsForm />);
  await screen.findByLabelText('Studio name');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(settings);
});

describe('SettingsForm', () => {
  it('shows every saved setting', async () => {
    await renderLoaded();

    expect(screen.getByLabelText('Studio name')).toHaveValue('ACS Dance Studio');
    expect(screen.getByLabelText('Most dates in a recurring booking')).toHaveValue('12');
    expect(screen.getByLabelText('Shared room discount')).toHaveValue('1.50');
    expect(screen.getByLabelText('Billing day')).toHaveValue('1');
    expect(screen.getByLabelText('Invoice number prefix')).toHaveValue('ACS');
    expect(screen.getByLabelText('Sort code')).toHaveValue('12-34-56');
    expect(screen.getByLabelText('Account number')).toHaveValue('12345678');
    expect(screen.getByText(/Invoices cover everything since the last one/)).toBeInTheDocument();
  });

  it('shows the error and retries when settings cannot be loaded', async () => {
    mockGet.mockRejectedValueOnce(apiError(500, 'boom'));
    render(<SettingsForm />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByLabelText('Studio name')).toBeInTheDocument();
  });

  it.each([
    ['Studio name', '', 'Studio name is required'],
    ['Most dates in a recurring booking', '53', 'Most dates must be 1 to 52'],
    ['Most people sharing a room', '1', 'Most people sharing a room must be 2 to 10'],
    ['Shared room discount', '1.555', 'Enter an amount in pounds, like 1.50'],
    ['Cancellation window', '169', 'Cancellation window must be 0 to 168'],
    ['Payment due', '0', 'Payment due must be 1 to 90'],
    ['Billing day', '29', 'Billing day must be 1 to 28'],
    ['Invoice number prefix', 'AC5', 'Letters only'],
    ['Sort code', '1234', 'Must be 6 digits, for example 12-34-56'],
    ['Account number', '123', 'Must be 8 digits'],
  ])('rejects %s = "%s"', async (label, value, message) => {
    await renderLoaded();

    const input = screen.getByLabelText(label);
    await userEvent.clear(input);
    if (value) await userEvent.type(input, value);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves the changes and shows a success toast', async () => {
    mockUpdate.mockResolvedValue({ ...settings, billingDay: 15 });
    await renderLoaded();

    const billingDay = screen.getByLabelText('Billing day');
    await userEvent.clear(billingDay);
    await userEvent.type(billingDay, '15');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        studioName: 'ACS Dance Studio',
        recurringMaxDates: 12,
        recurringMaxActive: 3,
        sharedRoomMax: 3,
        sharedDiscountPerHour: 1.5,
        cancellationWindowHours: 24,
        paymentDueDays: 14,
        billingDay: 15,
        invoicePrefix: 'ACS',
        businessName: 'ACS Ltd',
        businessAddress: '1 High Street',
        bankAccountName: 'ACS Ltd',
        bankSortCode: '12-34-56',
        bankAccountNumber: '12345678',
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Settings saved');
  });

  it('sends empty invoice details as null', async () => {
    mockUpdate.mockResolvedValue(settings);
    await renderLoaded();

    await userEvent.clear(screen.getByLabelText('Business address'));
    await userEvent.clear(screen.getByLabelText('Sort code'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ businessAddress: null, bankSortCode: null })
      )
    );
  });

  it("shows the backend's message when saving fails", async () => {
    mockUpdate.mockRejectedValue(apiError(400, 'billingDay: must be at most 28'));
    await renderLoaded();

    await userEvent.type(screen.getByLabelText('Studio name'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('billingDay: must be at most 28');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('only lets you save or discard once something has changed', async () => {
    await renderLoaded();

    const save = screen.getByRole('button', { name: 'Save changes' });
    const discard = screen.getByRole('button', { name: 'Discard' });
    expect(save).toBeDisabled();
    expect(discard).toBeDisabled();
    expect(screen.getByText('No unsaved changes.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Studio name'), ' Two');

    expect(save).toBeEnabled();
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
  });

  it('puts the saved values back when you discard', async () => {
    await renderLoaded();

    const studioName = screen.getByLabelText('Studio name');
    await userEvent.type(studioName, ' Two');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(studioName).toHaveValue('ACS Dance Studio');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('shows the unit next to number settings', async () => {
    await renderLoaded();

    expect(screen.getByText('hours')).toBeInTheDocument();
    expect(screen.getByText('£')).toBeInTheDocument();
  });

  describe('leaving with unsaved changes', () => {
    async function renderWithLink() {
      render(
        <>
          <a href="/admin/users">Users</a>
          <SettingsForm />
        </>
      );
      await screen.findByLabelText('Studio name');
    }

    it('lets you follow a link straight away when nothing has changed', async () => {
      await renderWithLink();

      await userEvent.click(screen.getByRole('link', { name: 'Users' }));

      expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
    });

    it('asks first, and stays when you choose to', async () => {
      await renderWithLink();
      await userEvent.type(screen.getByLabelText('Studio name'), ' Two');

      await userEvent.click(screen.getByRole('link', { name: 'Users' }));
      expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Stay on this page' }));

      await waitFor(() =>
        expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
      );
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Studio name')).toHaveValue('ACS Dance Studio Two');
    });

    it('goes to the link when you choose to leave', async () => {
      await renderWithLink();
      await userEvent.type(screen.getByLabelText('Studio name'), ' Two');

      await userEvent.click(screen.getByRole('link', { name: 'Users' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }));

      expect(mockPush).toHaveBeenCalledWith('/admin/users');
    });

    it("asks the browser to warn before closing the tab, only while there's something to save", async () => {
      await renderLoaded();
      const unload = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };

      expect(unload()).toBe(false);
      await userEvent.type(screen.getByLabelText('Studio name'), ' Two');
      expect(unload()).toBe(true);
    });
  });
});
