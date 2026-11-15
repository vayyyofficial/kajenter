# Frontend revision notes — Class Rolling / class portal

For backend developers continuing this project. SQL schema was **not** changed.

## A. Frontend changes

### Admin consolidation
- Website admin and Rolling Seat admin now share **`/admin`**.
- One tab bar: website tabs plus **Rolling: Ringkasan / Tata Letak / Siswa / Denah & Reroll / Riwayat / Jadwal** (no separate Rolling sidebar or login). `/admin/rolling` is kept only as a legacy URL that opens the Rolling overview tab.
- Legacy URLs:
  - `/admin/login` → password gate, then `/admin`
  - `/rolling-admin` → `/admin/rolling` (same password gate if logged out)
- Public pages no longer expose admin buttons or “Panel Pengurus” links. Access is by URL only.

### Authentication (frontend)
- Password is requested every time `/admin` is opened in a fresh render.
- JWT from `POST /api/auth/admin-verify` is stored **in memory only** (not `localStorage` / `sessionStorage`).
- Refresh, new tab, closed tab, Logout, or navigating to any non-`/admin` route (e.g. "Lihat Website") clears access; the session is ended in `AppContent` when the route leaves `admin`. This is UX + token handling, **not** a claim of standalone frontend security.
- Rolling mutations (`seatingAuthService.isAuthenticated()`) follow the same in-memory flag. The hardcoded Rolling password was removed from the client.

### Dark Mode — Rolling Seat
- Selected / highlighted seats and student rows use dark surfaces instead of bright yellow/white.
- Seat detail modal is wrapped in `seating-scope` so portal content follows the theme.

### Responsive
- Admin area switcher and tab bars wrap / scroll on small screens.
- Classroom map keeps its layout and scrolls horizontally inside the map card.
- Rolling admin mobile drawer is width-capped.
- Login actions stack on very narrow screens.

## B. Backend requirements

### Admin auth (needed for a complete security model)
Current frontend calls existing Express routes and expects:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/admin-verify` | Verify password, return JWT |
| GET | `/api/auth/admin-session` | Optional; frontend no longer restores a stored session on load |
| PUT | `/api/auth/admin-change-password` | Change password (already used by Security tab) |
| GET | `/api/auth/admin-status` | Lockout metadata (UI still reads it) |

Recommended follow-up (do **not** implement as a fake frontend check):

1. Prefer **httpOnly + `Secure` cookie** (or short-lived JWT + refresh) instead of returning a bearer token to JS, if the product requires stronger session control.
2. If product requirement is “password on every visit”, keep access-token lifetime very short or skip persistence (current frontend already skips persistence).
3. Remove plaintext fallback passwords in `server/routes/auth.ts` (`icptkj35` / `CONFIG.SUPERADMIN_PASSWORD`) if they are still present in production.
4. Rolling writes currently go through **Supabase anon** + permissive RLS. Admin mutations should be gated by the Express service role or authenticated RPC, not public `FOR ALL USING (true)`.

### Data integration
- `members` (portal) and `students` (Rolling) remain unlinked. Syncing them is a backend/data task.
- `get_active_seating()` still has a documented undefined `v_cycle_id` issue in `supabase-migration-rolling.sql`. Fix only via a **new** additive SQL file after review — do not edit the applied migration in place if production already ran it. Use `CREATE OR REPLACE FUNCTION`.

## C. Database documentation

See [`docs/DATABASE.md`](./DATABASE.md) and [`database/README.md`](../database/README.md).

No migration was executed and no production schema was altered in this revision.

## D. Testing

Status of this pass (honest record):

| Check | Result |
| --- | --- |
| `npm run lint` | **Not run** — the review sandbox had no network, so `node_modules` could not be installed. |
| `npm run build` (`tsc -b && vite build`) | **Not run** — same reason. |
| Browser / console / responsive / dark-mode visual testing | **Not run.** |
| Static source audit | Done: admin routing, in-memory auth flow, no admin links on public pages, no hardcoded password in `src/`, dark-mode overrides in `src/styles/seating.css`. |

Run these locally before deploying:

```bash
npm install
npm run lint
npm run build
npm run dev
```

Manual checklist: `/admin` asks for password; refresh asks again; "Lihat Website" then back to `/admin` asks again; `/rolling-admin` lands on `/admin/rolling` behind the same gate; Rolling Seat click/hover/focus in Dark Mode; widths 360 / 768 / 1024 / 1440.
