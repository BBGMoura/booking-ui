import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import {
  CreateBookingModal,
  HIGH_DEMAND_MESSAGE,
  SHAREABLE_FULL_MESSAGE,
  SLOT_TAKEN_MESSAGE,
} from '@/components/bookings/CreateBookingModal';
import { createBooking } from '@/lib/api/booking';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';

jest.mock('@/lib/api/booking', () => ({ createBooking: jest.fn() }));
jest.mock('@/lib/api/danceClass', () => ({ getClassTypes: jest.fn(), getDanceClass: jest.fn() }));

// 2026-11-18 is a Wednesday.
const start = new Date(2026, 10, 18, 10, 0);
const end = new Date(2026, 10, 18, 11, 30);

function backendError(status: number, error: string) {
  return new AxiosError('fail', String(status), undefined, undefined, {
    status,
    data: { status, error, message: 'backend message' },
  } as never);
}

function renderModal(range = { start, end }) {
  const handlers = { onClose: jest.fn(), onBooked: jest.fn(), onSlotUnavailable: jest.fn() };
  render(<CreateBookingModal room="ASTAIRE" {...range} {...handlers} />);
  return handlers;
}

async function chooseClassType(name: string) {
  await userEvent.click(await screen.findByRole('combobox', { name: 'Class type' }));
  await userEvent.click(await screen.findByRole('option', { name }));
}

beforeAll(() => {
  // Radix's Select and Switch need these, which jsdom lacks.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  jest.mocked(getClassTypes).mockResolvedValue(['PRIVATE', 'GROUP']);
  jest.mocked(getDanceClass).mockResolvedValue({
    classType: 'PRIVATE',
    active: true,
    pricePerHour: 20,
    role: 'ROLE_USER',
  });
  jest
    .mocked(createBooking)
    .mockReset()
    .mockResolvedValue({} as never);
});

describe('CreateBookingModal', () => {
  it('shows the fixed room and time and the role-aware class types', async () => {
    renderModal();

    expect(screen.getByText('Book Astaire')).toBeInTheDocument();
    expect(screen.getByText(/Wednesday 18 November, 10:00 – 11:30/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('combobox', { name: 'Class type' }));
    expect(await screen.findByRole('option', { name: 'Private' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Group' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Practice' })).not.toBeInTheDocument();
  });

  it('previews the price as the hourly price times the duration', async () => {
    renderModal();
    await chooseClassType('Private');

    expect(await screen.findByText('£30.00')).toBeInTheDocument();
    expect(getDanceClass).toHaveBeenCalledWith('PRIVATE');
  });

  it('requires a class type', async () => {
    renderModal();
    await userEvent.click(await screen.findByRole('button', { name: 'Book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Select a class type');
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('books the room and time with the chosen options, then reports success', async () => {
    const { onBooked } = renderModal();
    await chooseClassType('Private');
    await userEvent.click(screen.getByRole('switch', { name: 'Shareable' }));
    await userEvent.click(screen.getByRole('button', { name: 'Book' }));

    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(createBooking).toHaveBeenCalledWith({
      room: 'ASTAIRE',
      classType: 'PRIVATE',
      isShareable: true,
      dateFrom: expect.stringMatching(/^2026-11-18T10:00:00(Z|[+-]\d{2}:\d{2})$/),
      dateTo: expect.stringMatching(/^2026-11-18T11:30:00(Z|[+-]\d{2}:\d{2})$/),
    });
  });

  it.each([
    ['BOOKING_CONFLICT', SLOT_TAKEN_MESSAGE],
    ['BOOKING_SHAREABLE_LIMIT', SHAREABLE_FULL_MESSAGE],
  ])('hands a 400 %s back to the caller to refresh', async (code, message) => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, code));
    const { onSlotUnavailable, onBooked } = renderModal();
    await chooseClassType('Private');
    await userEvent.click(screen.getByRole('button', { name: 'Book' }));

    await waitFor(() => expect(onSlotUnavailable).toHaveBeenCalledWith(message));
    expect(onBooked).not.toHaveBeenCalled();
  });

  it('keeps the modal open on a 503 BOOKING_LOCK_TIMEOUT and lets the user retry', async () => {
    jest
      .mocked(createBooking)
      .mockRejectedValueOnce(backendError(503, 'BOOKING_LOCK_TIMEOUT'))
      .mockResolvedValueOnce({} as never);
    const { onBooked, onSlotUnavailable, onClose } = renderModal();
    await chooseClassType('Group');
    await userEvent.click(screen.getByRole('switch', { name: 'Shareable' }));
    await userEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByText(HIGH_DEMAND_MESSAGE)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSlotUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Shareable' })).toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Book' }));

    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(createBooking).toHaveBeenCalledTimes(2);
    expect(createBooking).toHaveBeenLastCalledWith(
      expect.objectContaining({ classType: 'GROUP', isShareable: true })
    );
  });

  it('shows other errors in the form like the rest of the app', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, 'SOMETHING_ELSE'));
    const { onSlotUnavailable, onClose } = renderModal();
    await chooseClassType('Private');
    await userEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByText('backend message')).toBeInTheDocument();
    expect(onSlotUnavailable).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('only treats BOOKING_LOCK_TIMEOUT as a lock timeout on a 503', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(500, 'BOOKING_LOCK_TIMEOUT'));
    renderModal();
    await chooseClassType('Private');
    await userEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByText(/Something went wrong on our end/)).toBeInTheDocument();
  });

  it('blocks a range the backend would reject without sending it', async () => {
    renderModal({ start: new Date(2026, 10, 18, 10, 0), end: new Date(2026, 10, 18, 10, 10) });

    expect(await screen.findByText(/at least 15 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book' })).toBeDisabled();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('closes on cancel', async () => {
    const { onClose } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
