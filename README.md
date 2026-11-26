# Booking UI

Frontend for the booking management system, built with Next.js, React, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI, shadcn/ui
- **Forms:** React Hook Form + Zod
- **HTTP:** Axios
- **Testing:** Jest, Playwright, Storybook

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start dev server with Turbopack         |
| `npm run build`        | Build for production                    |
| `npm run start`        | Start production server                 |
| `npm run lint`         | Run ESLint                              |
| `npm run format`       | Format code with Prettier               |
| `npm run format:check` | Check formatting without changing files |
| `npm test`             | Run Jest unit tests                     |
| `npx playwright test`  | Run Playwright e2e tests                |
| `npm run storybook`    | Start Storybook on port 6006            |

## Environment Variables

`.env.example` lists every variable and marks which are `NEXT_PUBLIC_` (build-time and visible to anyone, so never secret) and which are server-only. The full table for both apps is in [CONFIG.md](https://github.com/BBGMoura/booking-system/blob/master/CONFIG.md).

Copy `.env.dev` to `.env.local` and adjust the values if needed:

```bash
cp .env.dev .env.local
```

| Variable              | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (no trailing slash). The app appends `/api/v1` to it. |

By default this points at the hosted backend. To use a backend running locally, set it to the local address in `.env.local` (Spring Boot defaults to port 8080):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Restart the dev server after changing `.env.local`. The backend must allow `http://localhost:3000` as a CORS origin.
