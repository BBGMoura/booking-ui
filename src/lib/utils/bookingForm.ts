import { z } from 'zod';
import { CLASS_TYPES, ROOMS, type ClassType, type Room } from '@/lib/types/booking';
import {
  atMinutes,
  defaultBookingSlot,
  minutesOfDay,
  startTimeOptions,
  validateBookingTime,
} from '@/lib/utils/bookingTime';

export const bookingSchema = z
  .object({
    room: z.enum(Object.values(ROOMS) as [Room, ...Room[]], { error: 'Choose a room' }),
    date: z.date({ error: 'Choose a date' }),
    // Null while unchosen (a new date can clear them). Not undefined, which
    // Controller would read as "use the default value".
    start: z.number().nullable(),
    end: z.number().nullable(),
    classType: z.enum(Object.values(CLASS_TYPES) as [ClassType, ...ClassType[]], {
      error: 'Choose a booking type',
    }),
    isShareable: z.boolean(),
  })
  .superRefine(({ date, start, end }, ctx) => {
    if (start === null)
      ctx.addIssue({ code: 'custom', path: ['start'], message: 'Choose a start time' });
    if (end === null)
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'Choose an end time' });
    if (start === null || end === null) return;
    const from = atMinutes(date, start);
    // The backend allows past times, but booking one is never what's meant.
    if (from < new Date()) {
      ctx.addIssue({
        code: 'custom',
        path: ['start'],
        message: 'Choose a time that hasn’t passed',
      });
      return;
    }
    const message = validateBookingTime(from, atMinutes(date, end));
    if (message) ctx.addIssue({ code: 'custom', path: ['end'], message });
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;

/** What the form is opened or updated with. Anything left out is chosen in the form. */
export interface BookingDraft {
  room?: Room;
  /** A range picked on the calendar; without one the form suggests a slot on `day`. */
  start?: Date;
  end?: Date;
  /** The day to suggest a slot on when there's no range. Defaults to today. */
  day?: Date;
  classType?: ClassType;
  isShareable?: boolean;
}

/** The booking as it stands in the form, for the calendar to preview. */
export interface BookingPreview {
  room?: Room;
  date?: Date;
  /** Minutes after midnight; unset until chosen. */
  start?: number;
  end?: number;
  classType?: ClassType;
  isShareable: boolean;
}

/**
 * The form values a draft sets. On mount a draft without a range suggests a
 * slot; after mount it changes only what it names, so picking a room from the
 * calendar's filters keeps the chosen time.
 */
export function draftValues(draft: BookingDraft, isUpdate = false): Partial<BookingFormValues> {
  const values: Partial<BookingFormValues> = {
    ...(draft.room && { room: draft.room }),
    ...(draft.classType && { classType: draft.classType }),
    ...(draft.isShareable !== undefined && { isShareable: draft.isShareable }),
  };
  if (draft.start && draft.end) {
    return {
      ...values,
      date: draft.start,
      start: minutesOfDay(draft.start),
      end: minutesOfDay(draft.end),
    };
  }
  if (isUpdate && !draft.day) return values;
  const date = draft.day ?? new Date();
  const slot = defaultBookingSlot(date, new Date());
  return { ...values, date, start: slot?.start ?? null, end: slot?.end ?? null };
}

/** The start times on offer for `day`, leaving out any that have passed. */
export const upcomingStartTimes = (day: Date, now = new Date()) =>
  startTimeOptions(day).filter((time) => atMinutes(day, time) >= now);
