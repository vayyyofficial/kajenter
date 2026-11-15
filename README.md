# Website Kelas X ICP TKJ

Official class website for X ICP TKJ — SMK Telkom Malang. One integrated React + TypeScript + Vite
frontend with an Express backend, plus the **Rolling** tools (Rolling Seat and Rolling Groups) that
live inside the same site under a single **Rolling** navbar dropdown.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/pages` | Route pages (`BerandaPage`, `GaleriPage`, `AnggotaPage`, `ContactPage`, `AdminPage` + password gate, `RollingSeatPage`, `RollingKelompokPage`) |
| `src/components` | UI components. Rolling UI: `classroom/`, `groups/`, `admin/Seating*` (plain JSX, typed via sibling `.d.ts` shims) |
| `src/services` | `api.ts` for the main site; `seating*Service.ts` for Rolling (Supabase + local storage fallback) |
| `src/utils`, `src/data` | Helpers; Rolling scheduling/randomizer/timezone/validation live in `seating*.ts` |
| `src/styles` | `index.css`, `components.css`, `variables.css`, and `seating.css` (scoped Rolling base styles) |
| `server`, `api` | Express API (SQLite locally, Supabase in production) and the Vercel serverless entry |
| `supabase-*.sql` | Database scripts. `supabase-migration-rolling.sql` is the complete Rolling schema |

## Routes

`/beranda`, `/galeri`, `/anggota`, `/contact`, `/admin` (unified admin; password every visit),
`/admin/rolling` (Class Rolling tools inside the same admin), `/rolling-seat`, `/rolling-kelompok`.

Legacy aliases: `/admin/login` → `/admin`, `/rolling-admin` → `/admin/rolling`. There is no public Admin nav link.

Database index: `database/README.md`. Full schema notes: `docs/DATABASE.md`. Latest frontend/backend follow-up: `docs/REVISION-NOTES.md`.

## Getting started

```bash
npm install
cp .env.example .env
# Set ADMIN_INITIAL_PASSWORD and JWT_SECRET in .env before the first local run.
npm run dev            # Express API on :5000 + Vite on :5173
npm run build          # server + frontend type checks and production build
npm run lint
```

Production has no default admin password or JWT secret. Set the secrets in the hosting provider, use `ADMIN_INITIAL_PASSWORD` only for first-time database bootstrap, then remove it after changing the admin password.

## Rolling (Seat + Groups)

- **Rolling Seat** — 3-block classroom map (10 / 10 / 8 seats) for 26 active students, weekly automatic
  rotation every Sunday 06:00 WIB (Asia/Jakarta), manual reroll from the admin panel.
- **Rolling Groups** — balanced random group splitter (2–26 groups, round-robin) with confetti and a
  copy-to-WhatsApp result.
- Configure with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the app falls back to a safe
  local-storage mode if Supabase is unreachable).
- Database: run `supabase-migration-rolling.sql` once in the Supabase SQL Editor (tables, RLS policies,
  RPCs and the `pg_cron` weekly job).

## Deployment

Netlify is configured in `netlify.toml`: `/api/*` is routed to the Express function and browser routes fall back to the Vite SPA. Set the required server secrets and public Supabase build variables in Netlify; follow [`docs/DEPLOY-GUIDE.md`](docs/DEPLOY-GUIDE.md) for the database merge and preview checks.

For a standalone Node server run `npm run build && npm start` (Express serves `dist/` and falls back to `index.html` for client-side routes).
