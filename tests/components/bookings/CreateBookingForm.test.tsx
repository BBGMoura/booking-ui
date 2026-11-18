import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import {
  type BookingDraft,
  CreateBookingForm,
  HIGH_DEMAND_MESSAGE,
  NOT_FREE_MESSAGE,
  SHAREABLE_FULL_MESSAGE,
} from '@/components/bookings/CreateBookingForm';
import { createBooking, getRoomSchedule } from '@/lib/api/booking';
import type { BookingView } from '@/lib/types/booking';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';

jest.mock('@/lib/api/booking', () => ({ createBooking: jest.fn(), getRoomSchedule: jest.fn() }));
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

// The schedule endpoint's summary shape, as regular users get it.
function booked(from: Date, to: Date, shareable = false): BookingView {
  return {
    uid: `${from.toISOString()}-${shareable}`,
    room: 'ASTAIRE',
    classType: 'GROUP',
    status: 'BOOKED',
    shareable,
    bookedFrom: from.toISOString(),
    bookedTo: to.toISOString(),
  } as unknown as BookingView;
}

function renderForm(draft: BookingDraft = dragged) {
  const handlers = {
    onCancel: jest.fn(),
    onBooked: jest.fn(),
    onConflict: jest.fn(),
    onPreviewChange: jest.fn(),
  };
  const view = render(<CreateBookingForm draft={draft} {...handlers} />);
  return {
    ...handlers,
    rerender: (next: BookingDraft) =>
      view.rerender(<CreateBookingForm draft={next} {...handlers} />),
  };
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
  jest.mocked(getRoomSchedule).mockReset().mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CreateBookingForm', () => {
  it('fills in the room and time from a dragged range', async () => {
    renderForm();

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Astaire');
    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent('Wed 18 Nov');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('10:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('11:30');
  });

  it('suggests the next free hour when opened without a range', async () => {
    renderForm({ day: new Date(2026, 10, 18) });

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Choose a room');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('09:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('10:00');
  });

  it('offers only the class types the backend returns for the user', async () => {
    renderForm();
    await userEvent.click(await screen.findByRole('combobox', { name: 'Class type' }));

    expect(await screen.findByRole('option', { name: 'Private' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Group' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Practice' })).not.toBeInTheDocument();
  });

  it('previews the price as the hourly price times the duration', async () => {
    renderForm();
    await choose('Class type', 'Private');

    expect(await screen.findByText('£30.00')).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min at £20.00/hr')).toBeInTheDocument();
    expect(getDanceClass).toHaveBeenCalledWith('PRIVATE');
  });

  it('requires a room and a class type', async () => {
    renderForm({ start, end });
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
    renderForm();
    await choose('Start', '13:00');

    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('14:30');
  });

  it('only offers times within the chosen day’s opening hours', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('combobox', { name: 'Start' }));

    expect(await screen.findByRole('option', { name: '09:00' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '18:45' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '19:00' })).not.toBeInTheDocument();
  });

  it('clears times that fall outside a newly chosen day’s hours', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Date' }));
    await userEvent.click(await screen.findByRole('button', { name: /November 22nd, 2026/ }));

    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent('Sun 22 Nov');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('Start');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('End');
  });

  it('books the chosen room and time, then reports success', async () => {
    const { onBooked } = renderForm();
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
    ['BOOKING_CONFLICT', NOT_FREE_MESSAGE],
    ['BOOKING_SHAREABLE_LIMIT', SHAREABLE_FULL_MESSAGE],
  ])('shows a 400 %s by the button and reloads the room', async (code, message) => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, code));
    const { onConflict, onBooked } = renderForm();
    await choose('Class type', 'Private');
    await waitFor(() => expect(getRoomSchedule).toHaveBeenCalledTimes(1));
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(onConflict).toHaveBeenCalled();
    expect(onBooked).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Book room' })).toBeEnabled();
    await waitFor(() => expect(getRoomSchedule).toHaveBeenCalledTimes(2));
  });

  it('turns the overlap warning into an error once the backend refuses, until the time changes', async () => {
    jest
      .mocked(getRoomSchedule)
      .mockResolvedValue([booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12))]);
    jest.mocked(createBooking).mockRejectedValue(backendError(400, 'BOOKING_CONFLICT'));
    renderForm();
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Overlaps a booking \(11:00–12:00\)/
    );

    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Overlaps a booking \(11:00–12:00\)/
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await choose('Start', '13:00');
    expect(await screen.findByText('Astaire is free at this time.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the form open on a 503 BOOKING_LOCK_TIMEOUT and lets the user retry', async () => {
    jest
      .mocked(createBooking)
      .mockRejectedValueOnce(backendError(503, 'BOOKING_LOCK_TIMEOUT'))
      .mockResolvedValueOnce({} as never);
    const { onBooked, onConflict, onCancel } = renderForm();
    await choose('Class type', 'Group');
    await userEvent.click(screen.getByRole('switch', { name: 'Shareable' }));
    await submit();

    expect(await screen.findByText(HIGH_DEMAND_MESSAGE)).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConflict).not.toHaveBeenCalled();
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
    const { onConflict, onCancel } = renderForm();
    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByText('backend message')).toBeInTheDocument();
    expect(onConflict).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('only treats BOOKING_LOCK_TIMEOUT as a lock timeout on a 503', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(500, 'BOOKING_LOCK_TIMEOUT'));
    renderForm();
    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByText(/Something went wrong on our end/)).toBeInTheDocument();
  });

  it('blocks a range the backend would reject without sending it', async () => {
    renderForm({
      room: 'ASTAIRE',
      start: new Date(2026, 10, 18, 10, 0),
      end: new Date(2026, 10, 18, 10, 10),
    });
    await choose('Class type', 'Private');
    await submit();

    expect(await screen.findByText(/at least 15 minutes/)).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('cancels', async () => {
    const { onCancel } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('loads the room’s bookings for the chosen day', async () => {
    renderForm();

    await waitFor(() =>
      expect(getRoomSchedule).toHaveBeenCalledWith(
        'ASTAIRE',
        expect.stringMatching(/^2026-11-18T00:00:00/),
        expect.stringMatching(/^2026-11-19T00:00:00/)
      )
    );
  });

  it('says when the room is free at the chosen time', async () => {
    jest
      .mocked(getRoomSchedule)
      .mockResolvedValue([booked(new Date(2026, 10, 18, 12), new Date(2026, 10, 18, 13))]);
    renderForm();

    expect(await screen.findByText('Astaire is free at this time.')).toBeInTheDocument();
  });

  it('warns about an overlapping booking but still lets the user book', async () => {
    jest
      .mocked(getRoomSchedule)
      .mockResolvedValue([booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12))]);
    const { onBooked } = renderForm();

    expect(await screen.findByRole('status')).toHaveTextContent(
      /Overlaps a booking \(11:00–12:00\)\. Choose another time\./
    );

    await choose('Class type', 'Private');
    await submit();
    await waitFor(() => expect(onBooked).toHaveBeenCalled());
  });

  it('suggests sharing when the only overlaps are shareable', async () => {
    jest
      .mocked(getRoomSchedule)
      .mockResolvedValue([booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12), true)]);
    renderForm();

    expect(await screen.findByRole('status')).toHaveTextContent(/Turn on Shareable/);

    await userEvent.click(screen.getByRole('switch', { name: 'Shareable' }));
    expect(await screen.findByText('Astaire is free at this time.')).toBeInTheDocument();
  });

  it('moves the room and time to a new draft and keeps the other choices', async () => {
    const { rerender } = renderForm();
    await choose('Class type', 'Group');

    rerender({
      room: 'FOSSE',
      start: new Date(2026, 10, 20, 14, 0),
      end: new Date(2026, 10, 20, 15, 15),
    });

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Fosse');
    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent('Fri 20 Nov');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('14:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('15:15');
    expect(screen.getByRole('combobox', { name: 'Class type' })).toHaveTextContent('Group');
  });

  it('reports the booking as it changes, for the calendar to preview', async () => {
    const { onPreviewChange } = renderForm();
    await waitFor(() =>
      expect(onPreviewChange).toHaveBeenLastCalledWith({
        room: 'ASTAIRE',
        date: start,
        start: 10 * 60,
        end: 11 * 60 + 30,
        isShareable: false,
      })
    );

    await choose('Start', '13:00');
    expect(onPreviewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: 13 * 60, end: 14 * 60 + 30 })
    );
  });
});
