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

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm test` | Run Jest unit tests |
| `npm run storybook` | Start Storybook on port 6006 |

## Environment Variables

Copy `.env.local` and fill in the required values:

```bash
cp .env.dev .env.local
```
