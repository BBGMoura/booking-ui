import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import {
  type BookingDraft,
  CreateBookingModal,
  HIGH_DEMAND_MESSAGE,
  SHAREABLE_FULL_MESSAGE,
  SLOT_TAKEN_MESSAGE,
} from '@/components/bookings/CreateBookingModal';
import { createBooking } from '@/lib/api/booking';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';

jest.mock('@/lib/api/booking', () => ({ createBooking: jest.fn() }));
jest.mock('@/lib/api/danceClass', () => ({ getClassTypes: jest.fn(), getDanceClass: jest.fn() }));

// 2026-11-18 is a Wednesday, 2026-11-22 a Sunday.
const start = new Date(2026, 10, 18, 10, 0);
const end = new Date(2026, 10, 18, 11, 30);
const dragged: BookingDraft = { room: 'ASTAIRE', start, end };

function backendError(status: number, error: string) {
  return new AxiosError('fail', String(status), undefined, undefined, {
    status,
    data: { status, error, message: 'backend message' },
  } as never);
}

function renderModal(draft: BookingDraft = dragged) {
  const handlers = { onClose: jest.fn(), onBooked: jest.fn(), onSlotUnavailable: jest.fn() };
  render(<CreateBookingModal draft={draft} {...handlers} />);
  return handlers;
}

async function choose(field: string, option: string | RegExp) {
  await userEvent.click(await screen.findByRole('combobox', { name: field }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

const submit = async () => userEvent.click(screen.getByRole('button', { name: 'Book room' }));

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
  // Only the clock is faked, so the date picker's "no past days" rule is stable.
  jest.useFakeTimers({
    now: new Date(2026, 10, 18, 8, 20),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'performance',
      'hrtime',
    ],
  });
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

afterEach(() => {
  jest.useRealTimers();
});

describe('CreateBookingModal', () => {
  it('fills in the room and time from a dragged range', async () => {
    renderModal();

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Astaire');
    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent(
      'Wednesday 18 November 2026'
    );
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('10:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('11:30');
  });

  it('suggests the next free hour when opened without a range', async () => {
    renderModal({ day: new Date(2026, 10, 18) });

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Choose a room');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('09:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('10:00');
  });

  it('offers only the class types the backend returns for the user', async () => {
    renderModal();
    await userEvent.click(await screen.findByRole('combobox', { name: 'Class type' }));

    expect(await screen.findByRole('option', { name: 'Private' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Group' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Practice' })).not.toBeInTheDocument();
  });

  it('previews the price as the hourly price times the duration', async () => {
    renderModal();
    await choose('Class type', 'Private');

    expect(await screen.findByText('£30.00')).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min at £20.00/hr')).toBeInTheDocument();
    expect(getDanceClass).toHaveBeenCalledWith('PRIVATE');
  });

  it('requires a room and a class type', async () => {
    renderModal({ start, end });
    await screen.findByRole('combobox', { name: 'Class type' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Book room' })).toBeEnabled());
    await submit();

    await waitFor(() =>
      expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([
        'Choose a room',
        'Choose a class type',
      ])
    );
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('keeps the length of the booking when the start moves', async () => {
    renderModal();
    await choose('Start', '13:00');

    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('14:30');
  });

  it('only offers times within the chosen day’s opening hours', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('combobox', { name: 'Start' }));

    expect(await screen.findByRole('option', { name: '09:00' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '18:45' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '19:00' })).not.toBeInTheDocument();
  });

  it('clears times that fall outside a newly chosen day’s hours', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Date' }));
    await userEvent.click(await screen.findByRole('button', { name: /November 22nd, 2026/ }));

    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent(
      'Sunday 22 November 2026'
    );
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('Start');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('End');
  });

  it('books the chosen room and time, then reports success', async () => {
    const { onBooked } = renderModal();
    await choose('Room', 'Fosse');
    await choose('Class type', 'Private');
    await userEvent.click(screen.getByRole('switch', { name: 'Shareable' }));
    await submit();

    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(createBooking).toHaveBeenCalledWith({
      room: 'FOSSE',
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
    await choose('Class type', 'Private');
    await submit();

    await waitFor(() => expect(onSlotUnavailable).toHaveBeenCalledWith(message));
    expect(onBooked).not.toHaveBeenCalled();
  });

  it('keeps the modal open on a 503 BOOKING_LOCK_TIMEOUT and lets the user retry', async () => {
    jest
      .mocked(createBooking)
      .mockRejectedValueOnce(backendError(503, 'BOOKING_LOCK_TIMEOUT'))
      .mockResolvedValueOnce({} as never);
    const { onBooked, onSlotUnavailable, onClose } = renderModal();
    await choose('Class type', 'Group');
    await userEvent.click(screen.getByRole('switch', { name: 'Shareable' }));
    await submit();

    expect(await screen.findByText(HIGH_DEMAND_MESSAGE)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSlotUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Shareable' })).toBeChecked();

    await submit();

    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(createBooking).toHaveBeenCalledTimes(2);
    expect(createBooking).toHaveBeenLastCalledWith(
      expect.objectContaining({ classType: 'GROUP', isShareable: true })
    );
  });

  it('shows other errors in the form like the rest of the app', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, 'SOMETHING_ELSE'));
    const { onSlotUnavailable, onClose } = renderModal();
    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByText('backend message')).toBeInTheDocument();
    expect(onSlotUnavailable).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('only treats BOOKING_LOCK_TIMEOUT as a lock timeout on a 503', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(500, 'BOOKING_LOCK_TIMEOUT'));
    renderModal();
    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByText(/Something went wrong on our end/)).toBeInTheDocument();
  });

  it('blocks a range the backend would reject without sending it', async () => {
    renderModal({
      room: 'ASTAIRE',
      start: new Date(2026, 10, 18, 10, 0),
      end: new Date(2026, 10, 18, 10, 10),
    });
    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByText(/at least 15 minutes/)).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('closes on cancel', async () => {
    const { onClose } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
