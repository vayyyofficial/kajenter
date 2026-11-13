# Unified admin + shared student data — frontend notes & backend requirements

Scope of this pass: frontend only. Nothing under `server/`, no `.sql` file, no Supabase schema/RLS/records/RPC was modified.

## 1. What changed

- **One admin panel** at `/admin`. Rolling views are tabs in the same tab bar; the separate Rolling sidebar/header/login were removed. Legacy `/admin/rolling` and `/rolling-admin` open the Rolling overview tab behind the same password gate.
- **One session.** Rolling services (`seatingStudentService`, `seatingLayoutService`, `seatingArrangementService`) now check `isAdminSessionActive()` from `src/services/adminSession.ts`. `src/services/seatingAuthService.ts` was deleted.
- **Rolling banner:** `@tailwind base;` is the first line of `src/styles/seating.css`; banner title has `text-white`.
- **Cleanup:** removed `scratch/`, the 9 `public/uploads/story-*` files, `LanguageSwitcher.tsx`, `DefaultAvatar.tsx`, deps `jspdf` / `clsx` / `tailwind-merge` (+ `package-lock.json` synced) and the jspdf chunk in `vite.config.ts`.
- **Dark mode / mobile (admin only):** extra dark overrides for Rolling admin views in `seating.css` (PART IV); admin overview/gallery grids no longer force a minimum width wider than a small phone.
- Public email and phone on member pages were not touched.

## 2. Shared student data (single entry point)

Student identity (name, nickname, absen number) is entered **only** in the `members` data (`member_type = 'siswa'`, Admin → Anggota).

`seatingStudentService.fetchStudents()` builds the Rolling roster from members and links each member to its Supabase `students` row **by absen number, then by normalised full name** (`mergeRoster`). Result:

- A name changed in Admin → Anggota appears in Rolling Seat, Group Randomizer and Rolling admin (live via the existing `members` SSE sync).
- Adding / editing / deleting a student from the Rolling "Siswa" tab writes to the **member first**, then mirrors to the linked `students` row. Deleting a member **deactivates** (never hard-deletes) the `students` row, because `seating_assignments.student_id` references it with `ON DELETE CASCADE`.
- Active / inactive for rotation stays on `students.is_active` (Rolling-only attribute).
- "Reset ke 26 Siswa Awal" was removed: it would create an independent copy of the data.
- `INITIAL_STUDENTS` is only a last-resort offline fallback when neither the members API nor Supabase has ever been reachable.

### Why this is not yet a single *record*

The reshuffle (`execute_seating_reroll`, weekly `cron_execute_weekly_reroll`) runs in Postgres and reads `public.students WHERE is_active`, and seat assignments store `students.id` (UUID). The frontend therefore cannot make `members` feed the shuffle by itself, and the two tables still hold two rows per student, kept aligned by write-through.

Known edge cases of the link:
- A member with no matching `students` row is shown with a **"Belum terhubung"** badge and is not seated until a row exists (rows are created automatically only when the student is added from the Rolling tab).
- Changing a member's absen number **and** name in a way that matches neither key unlinks the pair.
- An active `students` row without a member stays visible (it still takes part in the DB shuffle).

## 3. Backend / Supabase work required (for the developer)

1. **Real single source:** add `students.member_id` (FK → members) or replace `students` with a view over `members`, and have `execute_seating_reroll` / `cron_execute_weekly_reroll` read members. Then the name-matching in `mergeRoster` can be dropped. Do this as a **new** additive migration, not by editing applied files.
2. **Auto-link:** a trigger or endpoint that creates / updates / deactivates the `students` row when a member is created / edited / deleted, so the frontend mirror is no longer needed.
3. **Rolling writes use the public anon key** with `FOR ALL USING (true)` RLS (`students`, layouts, RPC `execute_seating_reroll`). The main-admin check in the frontend is UX only; real protection needs the Express service role or authenticated RPCs.
4. **Admin session storage key:** the frontend keeps the admin JWT **in memory** (refresh / new tab asks for the password again) and only wipes the old `x_icp_admin_token` key. If the product instead wants the session persisted under `x_icp_admin_token`, that is a deliberate change to `adminSession.ts`.
5. **Default passwords** `icptkj35` (`server/db/seed.ts`, `server/db/sqlite.ts`) and the `SUPERADMIN_PASSWORD` fallback (`server/config.ts`) are still in server code. Rotate and remove them.
6. **Member creation side effect:** `POST /api/members` also creates a member login with a default password; adding a student from the Rolling tab therefore creates a member account too.
7. **Deleted story uploads:** the 9 `public/uploads/story-m4-*` files had no reference in the repo or local SQLite. Check production `stories` data before deploying.
8. Known issue (unchanged): `get_active_seating()` references an undefined `v_cycle_id`; fix with a new `CREATE OR REPLACE FUNCTION`.

## 4. Verification status

Not executed in the review environment (no network, dependencies could not be installed): `npm run lint`, `npm run build`, browser / console / responsive / dark-mode visual testing, add/edit student, save layout, reshuffle, login flow.

Done statically: all 80 source files parse; no unresolved relative imports; no import of a package missing from `package.json`; no remaining reference to `seatingAuthService`, `LanguageSwitcher`, `DefaultAvatar`, `jspdf`, `clsx`, `tailwind-merge`.
