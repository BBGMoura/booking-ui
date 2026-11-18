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
