# booking-ui

## Generated components: don't edit them, build on top

Components added with `npx shadcn add` (shadcn's own and those from other registries, such as
`@fullcalendar` in `components.json`) are generated files. Leave them exactly as the CLI wrote
them, so they can be updated later by running `shadcn add` again without losing our changes.

- **Where they live.** Leave generated files wherever the CLI puts them. It chooses the folder from
  the registry item's type: `registry:ui` goes in `src/components/ui/`, and `registry:component`
  goes in `src/components/`. Don't move or rename them, because a re-add would put them back.
- **Don't change them.** No restyling, no refactors, no lint or type fixes, no comments. Running
  Prettier over them is fine.
- **Customise in our own components.** Put customisations in our own components in a feature
  folder (for example `src/components/bookings/`) that import the generated pieces and add our
  styling or behaviour around them. If a generated wrapper can't be styled from outside, write our
  own version of that wrapper next to the feature and use it instead of editing the generated one.
  For an example, see `BookingsCalendar` and `BookingsCalendarToolbar`, built on the registry's
  untouched `EventCalendarViews`.
- **Updating.** After re-running `shadcn add`, review the diff of the generated files. Check that
  our components still type-check and look right.

If a generated file really has to change (for example a bug with no way around it), say so in the
PR under "Things to check" so it's a deliberate decision.

## Names

Use these names in anything a person reads (labels, page titles, toasts, tests' visible strings).
Use the backend name only in code that talks to the API. What each concept means is in the
[Booking Portal design](https://linear.app/acs-booking-system/document/booking-portal-design-concepts-rules-and-data-model-e3899a5d8599).

| UI name                                    | Meaning                                                                                                                                                                                                   | Backend name                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Booking Portal**                         | The app                                                                                                                                                                                                   | —                                                                   |
| **Booking**                                | One room, one time slot, one booking type. It's **for** someone (the person who pays, or the studio) and **made by** a person (who did it).                                                               | `Booking`                                                           |
| **Booking type**                           | What the room is used for, in two kinds. **Room hire** (**Private lesson**, **Practice**, **Other**) is charged at a floor fee. **Studio use** (**Group class**, **Closed**) is never charged.            | `ClassType`: `PRIVATE`, `PRACTICE`, `OTHER`, `GROUP`, `UNAVAILABLE` |
| **Studio**                                 | Who a booking is for when it isn't for a person (a class or Closed). Never charged.                                                                                                                       | `booked_for_id` null, `forStudio`                                   |
| **Floor fee**                              | The price per hour for one room-hire booking type, and whether it's **Admin only**                                                                                                                        | `DanceClass` (`pricePerHour`; `role` `ROLE_ADMIN` = Admin only)     |
| **Shared room** / **Shared room discount** | Other users can book the room at the same time; room hire only. The discount per hour for sharing.                                                                                                        | `shareable`, `shared_discount_per_hour`                             |
| **Recurring booking**                      | A person's booking repeated on several dates, up to the limit in Settings. Each date is a normal booking and shows as **Free**, **Taken**, **Excluded** or **Closed**.                                    | `recurring_booking`                                                 |
| **Timetable** / **Class**                  | The studio's plan for one term (**Draft**, then **Published**; **Duplicate** one to plan the next term) and a group class in it that runs weekly in one room at one time                                  | `timetable`, `timetable_class`                                      |
| **Invoice** / **Charge** / **Billing day** | One invoice per person per month, **Outstanding** or **Settled** (the action is **Mark as settled**, never "reconcile"). A charge is one booking billed on it. The billing day is when invoices are made. | `invoice`, `invoice_charge`, `billing_day`                          |
| **Settings**                               | The studio's own settings: limits, billing and so on                                                                                                                                                      | `studio_settings`                                                   |
| **User** / **Admin**                       | Roles. Only shown when inviting a user, and as an Admin badge in the users list.                                                                                                                          | `ROLE_USER` / `ROLE_ADMIN`                                          |

**Pages:** Dashboard (`/dashboard`), Room calendar (`/calendar`), My bookings (`/my-bookings`),
Invoices (`/invoices`), Profile (`/profile`), Admin › Users (`/admin/users`), Admin › Floor fees
(`/admin/floor-fees`), Admin › Recurring bookings (`/admin/recurring`), Admin › Timetables
(`/admin/timetables`), Admin › Invoices (`/admin/invoices`), Admin › Settings (`/admin/settings`).
Not built yet: Invoices, Admin › Recurring bookings, Admin › Timetables, Admin › Invoices and
Admin › Settings. Admin › Floor fees is still Admin › Room rates at `/admin/rates` until it's
renamed.

Don't call users teachers. Anyone the studio invites can book.
