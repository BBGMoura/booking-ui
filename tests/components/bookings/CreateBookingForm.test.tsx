import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { CreateBookingForm } from '@/components/bookings/CreateBookingForm';
import type { BookingDraft } from '@/lib/utils/bookingForm';
import {
  HIGH_DEMAND_MESSAGE,
  NOT_FREE_MESSAGE,
  SHAREABLE_FULL_MESSAGE,
} from '@/lib/utils/bookingMessages';
import { createBooking } from '@/lib/api/booking';
import type { BookingView } from '@/lib/types/booking';
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

// The schedule endpoint's summary shape, as regular users get it.
function booked(from: Date, to: Date, shareable = false): BookingView {
  return {
    uid: `${from.toISOString()}-${shareable}`,
    room: 'ASTAIRE',
    classType: 'OTHER',
    status: 'BOOKED',
    shareable,
    bookedFrom: from.toISOString(),
    bookedTo: to.toISOString(),
  } as unknown as BookingView;
}

/**
 * @param schedule the room's bookings the page would pass in, or null while
 *     they're loading; an empty room by default
 */
function renderForm(draft: BookingDraft = dragged, schedule: BookingView[] | null = []) {
  const handlers = {
    onBooked: jest.fn(),
    onConflict: jest.fn(),
    onPreviewChange: jest.fn(),
  };
  const view = render(<CreateBookingForm draft={draft} schedule={schedule} {...handlers} />);
  return {
    ...handlers,
    rerender: (next: BookingDraft, nextSchedule = schedule) =>
      view.rerender(<CreateBookingForm draft={next} schedule={nextSchedule} {...handlers} />),
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
  jest.mocked(getClassTypes).mockResolvedValue(['PRIVATE', 'OTHER']);
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

  it('offers only the booking types the backend returns for the user', async () => {
    renderForm();
    await userEvent.click(await screen.findByRole('combobox', { name: 'Booking type' }));

    expect(await screen.findByRole('option', { name: 'Private' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Closed' })).not.toBeInTheDocument();
  });

  it('never offers Group class, even if the backend sends it', async () => {
    jest.mocked(getClassTypes).mockResolvedValue(['PRIVATE', 'GROUP', 'UNAVAILABLE']);
    renderForm();
    await userEvent.click(await screen.findByRole('combobox', { name: 'Booking type' }));

    expect(await screen.findByRole('option', { name: 'Closed' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Group class' })).not.toBeInTheDocument();
  });

  describe('when an admin picks Closed', () => {
    beforeEach(() => {
      jest.mocked(getClassTypes).mockResolvedValue(['PRIVATE', 'UNAVAILABLE']);
    });

    it('says No charge instead of fetching a floor fee', async () => {
      renderForm();
      await choose('Booking type', 'Closed');

      expect(await screen.findByText('No charge')).toBeInTheDocument();
      expect(getDanceClass).not.toHaveBeenCalledWith('UNAVAILABLE');
      expect(screen.queryByText(/\/hr/)).not.toBeInTheDocument();
    });

    it('switches Shared room off and disables it with a reason', async () => {
      renderForm({ ...dragged, classType: 'PRIVATE', isShareable: true });
      await choose('Booking type', 'Closed');

      const shared = screen.getByRole('switch', { name: 'Shared room' });
      await waitFor(() => expect(shared).not.toBeChecked());
      expect(shared).toBeDisabled();
      expect(screen.getByText('Closed takes the whole room.')).toBeInTheDocument();
    });

    it('books it as not shared', async () => {
      renderForm({ ...dragged, classType: 'PRIVATE', isShareable: true });
      await choose('Booking type', 'Closed');
      await submit();

      await waitFor(() =>
        expect(createBooking).toHaveBeenCalledWith(
          expect.objectContaining({ classType: 'UNAVAILABLE', isShareable: false })
        )
      );
    });

    it('charges again once another booking type is chosen', async () => {
      renderForm();
      await choose('Booking type', 'Closed');
      await choose('Booking type', 'Private');

      expect(await screen.findByText('£30.00')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Shared room' })).toBeEnabled();
    });
  });

  it('previews the price as the hourly price times the duration', async () => {
    renderForm();
    await choose('Booking type', 'Private');

    expect(await screen.findByText('£30.00')).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min at £20.00/hr')).toBeInTheDocument();
    expect(getDanceClass).toHaveBeenCalledWith('PRIVATE');
  });

  it('requires a room and a booking type', async () => {
    renderForm({ start, end });
    await screen.findByRole('combobox', { name: 'Booking type' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Book room' })).toBeEnabled());
    await submit();

    await waitFor(() =>
      expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([
        'Choose a room',
        'Choose a booking type',
      ])
    );
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('fills in and shows an end time when a start is chosen with no time set', async () => {
    // After 18:00 an hour no longer fits before closing, so no slot is suggested.
    jest.setSystemTime(new Date(2026, 10, 18, 18, 5));
    renderForm({ room: 'ASTAIRE', day: new Date(2026, 10, 18) });
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('End');

    await choose('Start', '18:15');

    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('19:00');
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

  it('books the chosen room and time, then hands back the saved booking', async () => {
    const saved = { uid: 'saved-1', totalPrice: 30 } as BookingView;
    jest.mocked(createBooking).mockResolvedValue(saved);
    const { onBooked } = renderForm();
    await choose('Room', 'Fosse');
    await choose('Booking type', 'Private');
    await userEvent.click(screen.getByRole('switch', { name: 'Shared room' }));
    await submit();

    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(saved));
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
  ])('shows a 400 %s by the button and asks for the room to be reloaded', async (code, message) => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, code));
    const { onConflict, onBooked } = renderForm();
    await choose('Booking type', 'Private');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(onConflict).toHaveBeenCalled();
    expect(onBooked).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Book room' })).toBeEnabled();
  });

  it('says what is in the way once the reloaded schedule shows the clash', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, 'BOOKING_CONFLICT'));
    const { rerender } = renderForm();
    await choose('Booking type', 'Private');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FREE_MESSAGE);

    rerender(dragged, [booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12))]);

    expect(screen.getByRole('alert')).toHaveTextContent(/Overlaps a booking \(11:00–12:00\)/);
  });

  it('turns the overlap warning into an error once the backend refuses, until the time changes', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, 'BOOKING_CONFLICT'));
    renderForm(dragged, [booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12))]);
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Overlaps a booking \(11:00–12:00\)/
    );

    await choose('Booking type', 'Private');
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
    const { onBooked, onConflict } = renderForm();
    await choose('Booking type', 'Other');
    await userEvent.click(screen.getByRole('switch', { name: 'Shared room' }));
    await submit();

    expect(await screen.findByText(HIGH_DEMAND_MESSAGE)).toBeInTheDocument();
    expect(onConflict).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Shared room' })).toBeChecked();

    await submit();

    await waitFor(() => expect(onBooked).toHaveBeenCalled());
    expect(createBooking).toHaveBeenCalledTimes(2);
    expect(createBooking).toHaveBeenLastCalledWith(
      expect.objectContaining({ classType: 'OTHER', isShareable: true })
    );
  });

  it('shows other errors in the form like the rest of the app', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(400, 'SOMETHING_ELSE'));
    const { onConflict } = renderForm();
    await choose('Booking type', 'Private');
    await submit();

    expect(await screen.findByText('backend message')).toBeInTheDocument();
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('only treats BOOKING_LOCK_TIMEOUT as a lock timeout on a 503', async () => {
    jest.mocked(createBooking).mockRejectedValue(backendError(500, 'BOOKING_LOCK_TIMEOUT'));
    renderForm();
    await choose('Booking type', 'Private');
    await submit();

    expect(await screen.findByText(/Something went wrong on our end/)).toBeInTheDocument();
  });

  it('blocks a range the backend would reject without sending it', async () => {
    renderForm({
      room: 'ASTAIRE',
      start: new Date(2026, 10, 18, 10, 0),
      end: new Date(2026, 10, 18, 10, 10),
    });
    await choose('Booking type', 'Private');
    await submit();

    expect(await screen.findByText(/at least 15 minutes/)).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('says nothing about availability until the room’s bookings have loaded', async () => {
    renderForm(dragged, null);
    await screen.findByRole('combobox', { name: 'Booking type' });

    expect(screen.queryByText(/is free at this time/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says when the room is free at the chosen time', async () => {
    renderForm(dragged, [booked(new Date(2026, 10, 18, 12), new Date(2026, 10, 18, 13))]);

    expect(await screen.findByText('Astaire is free at this time.')).toBeInTheDocument();
  });

  it('warns about an overlapping booking but still lets the user book', async () => {
    const { onBooked } = renderForm(dragged, [
      booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12)),
    ]);

    expect(await screen.findByRole('status')).toHaveTextContent(
      /Overlaps a booking \(11:00–12:00\)\. Choose another time\./
    );

    await choose('Booking type', 'Private');
    await submit();
    await waitFor(() => expect(onBooked).toHaveBeenCalled());
  });

  it('suggests sharing when the only overlaps are shareable', async () => {
    renderForm(dragged, [booked(new Date(2026, 10, 18, 11), new Date(2026, 10, 18, 12), true)]);

    expect(await screen.findByRole('status')).toHaveTextContent(/Turn on Shared room/);

    await userEvent.click(screen.getByRole('switch', { name: 'Shared room' }));
    expect(await screen.findByText('Astaire is free at this time.')).toBeInTheDocument();
  });

  it('moves the room and time to a new draft and keeps the other choices', async () => {
    const { rerender } = renderForm();
    await choose('Booking type', 'Other');

    rerender({
      room: 'FOSSE',
      start: new Date(2026, 10, 20, 14, 0),
      end: new Date(2026, 10, 20, 15, 15),
    });

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Fosse');
    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent('Fri 20 Nov');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('14:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('15:15');
    expect(screen.getByRole('combobox', { name: 'Booking type' })).toHaveTextContent('Other');
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

  it('keeps the time when a draft moves the booking earlier by more than its length', async () => {
    const { rerender, onPreviewChange } = renderForm({
      room: 'ASTAIRE',
      start: new Date(2026, 10, 18, 14, 0),
      end: new Date(2026, 10, 18, 15, 0),
    });

    rerender({
      room: 'ASTAIRE',
      start: new Date(2026, 10, 18, 11, 0),
      end: new Date(2026, 10, 18, 12, 0),
    });

    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('11:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('12:00');
    await waitFor(() =>
      expect(onPreviewChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: 11 * 60, end: 12 * 60 })
      )
    );
  });

  it('changes only the room for a room-only draft', async () => {
    const { rerender } = renderForm();
    await choose('Booking type', 'Other');

    rerender({ room: 'BUSSELL' });

    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveTextContent('Bussell');
    expect(screen.getByRole('combobox', { name: 'Start' })).toHaveTextContent('10:00');
    expect(screen.getByRole('combobox', { name: 'End' })).toHaveTextContent('11:30');
    expect(screen.getByRole('combobox', { name: 'Booking type' })).toHaveTextContent('Other');
  });

  it('opens with the booking type and shareable choice a draft carries', async () => {
    renderForm({ ...dragged, classType: 'OTHER', isShareable: true });

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Booking type' })).toHaveTextContent('Other')
    );
    expect(screen.getByRole('switch', { name: 'Shared room' })).toBeChecked();
  });

  it('rejects a time that has already passed', async () => {
    renderForm({
      room: 'ASTAIRE',
      start: new Date(2026, 10, 18, 7, 0),
      end: new Date(2026, 10, 18, 8, 0),
    });
    await choose('Booking type', 'Private');
    await submit();

    expect(await screen.findByText('Choose a time that hasn’t passed')).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('never shows the previous booking type’s price while the new one loads', async () => {
    let resolveOther: (value: Awaited<ReturnType<typeof getDanceClass>>) => void = () => {};
    jest
      .mocked(getDanceClass)
      .mockResolvedValueOnce({
        classType: 'PRIVATE',
        active: true,
        pricePerHour: 20,
        role: 'ROLE_USER',
      })
      .mockReturnValueOnce(new Promise((resolve) => (resolveOther = resolve)));
    renderForm();
    await choose('Booking type', 'Private');
    expect(await screen.findByText('£30.00')).toBeInTheDocument();

    await choose('Booking type', 'Other');
    expect(screen.queryByText('£30.00')).not.toBeInTheDocument();

    resolveOther({ classType: 'OTHER', active: true, pricePerHour: 10, role: 'ROLE_USER' });
    expect(await screen.findByText('£15.00')).toBeInTheDocument();
  });

  it('offers only start times that haven’t passed today', async () => {
    jest.setSystemTime(new Date(2026, 10, 18, 13, 20));
    renderForm({ room: 'ASTAIRE', day: new Date(2026, 10, 18) });
    await userEvent.click(screen.getByRole('combobox', { name: 'Start' }));

    expect(await screen.findByRole('option', { name: '13:30' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '13:15' })).not.toBeInTheDocument();
  });

  it.each([
    [400, 'BOOKING_CONFLICT'],
    [503, 'BOOKING_LOCK_TIMEOUT'],
    [500, 'SOMETHING_ELSE'],
  ])('clears a %s %s error once the room changes', async (status, code) => {
    jest.mocked(createBooking).mockRejectedValue(backendError(status, code));
    renderForm();
    await choose('Booking type', 'Private');
    await submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await choose('Room', 'Fosse');

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
