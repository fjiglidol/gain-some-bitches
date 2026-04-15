# Lifting Tracker

A mobile-first web app for logging push/pull/legs sessions. Per-set weight and reps, rest timer overlay, drop sets, session resume, and workout history — all running client-side.

**Live:** https://fjiglidol.github.io/lifting-tracker/

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Motion (Framer Motion) + Lucide icons
- Service worker + manifest (installable, works offline)
- Optional Express server (`server.ts`) for CSV export on a local machine — not used by the deployed site

## Run locally

Requires Node.js.

```bash
npm install
npm run dev        # Vite dev server on :3000
```

With the optional CSV-export server:

```bash
npm start          # Express on :3001 + Vite on :3000
```

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the built output
npm run lint       # tsc --noEmit
```

## Storage

All user data stays on-device. Two localStorage keys:

- `liftoff_session` — the in-progress session (auto-saved on every input, resumes within 12 hours)
- `gsb_history` — completed sessions

When the optional Express server is running, sessions are also written as CSV files locally. The deployed site has no backend — nothing leaves your browser.

## Programme data

The default training programme ships in `src/data/programme.json`. It defines the session types and exercises the app offers out of the box.

## Deployment

Pushes to `main` deploy to GitHub Pages under `/lifting-tracker/` (base path configured in `vite.config.ts`).
