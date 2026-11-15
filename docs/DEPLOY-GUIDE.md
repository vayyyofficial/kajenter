# Deployment and Supabase Consolidation Guide

This guide covers the current Netlify/Supabase deployment and a later coordinated hosting-and-database move. No live account operation has been run from this repository.

## Interim plan: keep the current Netlify and Supabase projects

Per the client's direction, keep the existing Netlify site and existing Supabase project(s) for now. Deploy this code to the current Netlify site after testing a preview. Do **not** copy data to a different Supabase project, switch project URLs/keys, change cron schedules, or apply the consolidation migrations 001–005 during this interim release. The backend supports the existing physical `public.students` schema as well as the future normalized schema, so the app can run before the later coordinated migration. The old and current Supabase projects should remain untouched until the hosting and database move are scheduled together.

The function entry is `netlify/functions/api.ts`; it wraps Express with `serverless-http`. Netlify builds with `npm run build`, publishes `dist`, and routes `/api/*` to that function. Preserve the currently working Netlify environment variables; verify the existing values in Netlify rather than replacing them from this guide.

## 1. What this change does

- Netlify serves the Vite SPA and routes `/api/*` to an Express function.
- The existing admin API rejects the old hard-coded password fallbacks, uses persistent five-attempt / ten-minute lockout state, and invalidates old admin tokens after a password change.
- The website's core tables are public-read only through the Supabase API. The Express API uses the service-role key for its CRUD operations.
- Retired Class Portal tables are moved to the `archive` schema without dropping their data.
- The Rolling roster API supports both the existing physical `public.students` table and the future normalized, read-only view/UUID bridge. On legacy schemas, identity updates synchronize to `members` only when an exact safe match exists; ambiguous data is rejected for manual review.
- In the later coordinated consolidation, `members` becomes the sole student identity source and migration 005 converts `public.students` to a read-only view over a minimal UUID/active-state bridge. This migration is not needed for the interim deployment.

## Future coordinated hosting-and-database move (not part of the interim deploy)

The remaining steps in sections 2–5 are for the later move. Do not run them for the current Netlify release unless the owner schedules the joint migration and approves the database backup/reconciliation window.

## 2. Back up first

1. In each Supabase project, create and download a database backup (and separately back up Storage objects if needed).
2. Record the source and destination project refs. The **destination** is the current website project because it owns `members`, gallery, and admin data.
3. Do not paste account passwords, service-role keys, or JWT secrets into chat, tickets, or Git.

## 3. Prepare the destination database

In the destination project's SQL Editor, check whether the Rolling tables already exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'students', 'classroom_layouts', 'seats', 'seating_periods',
    'seating_assignments', 'reroll_history', 'saved_class_groups'
  )
ORDER BY table_name;
```

If any are missing, review `supabase-migration-rolling.sql` and create only the missing schema objects before copying. Do not blindly rerun the legacy file: it also contains seed rows, policies, functions, and cron configuration. If all seven tables already exist, do not run it again.

Before changing student data, run `database/checks/student-dedupe-preflight.sql`. Resolve duplicate attendance numbers and Rolling rows with no member at the same attendance number. Review every name mismatch against a trusted roster; only manually verified identities should be explicitly linked. The migration will not infer identity from an attendance-number match alone.

## 4. Preview the Rolling copy

Set these variables in a **local shell only**, using service-role keys from the two project settings pages:

```sh
export OLD_ROLLING_URL='https://<old-rolling-project>.supabase.co'
export OLD_ROLLING_KEY='<old-project-service-role-key>'
export MAIN_URL='https://<website-project>.supabase.co'
export MAIN_KEY='<website-project-service-role-key>'
node scripts/migrate-rolling-data.mjs --dry-run
```

The script is read-only unless called with `--apply`. It copies tables in foreign-key order and preserves UUIDs. It skips identical IDs and stops on any same-ID/different-content conflict. Resolve a conflict manually and take another backup before retrying; do not modify the script to overwrite destination rows.

Review every table count and conflict result. If the preview is clean, run:

```sh
node scripts/migrate-rolling-data.mjs --apply
```

The script does not move Storage files or change cron jobs. Do not turn off the old project's schedule yet.

## 5. Apply the numbered migrations (future migration only)

Only during the later coordinated migration, after backups and a successful preflight, run these files in the destination SQL Editor **one at a time and in order**:

1. `database/migrations/001-archive-retired-portal.sql`
2. `database/migrations/002-restrict-public-api.sql`
3. `database/migrations/003-link-rolling-students.sql`
4. `database/migrations/004-fix-active-seating-rpc.sql`
5. `database/migrations/005-normalize-rolling-students.sql`

Migrations 001–002 archive retired tables and restrict website-table writes. Migration 003 auto-links only unique attendance-number plus normalized full-name matches. Manually reviewed mismatches must be explicitly linked before migration 005, which stops if any row is unresolved. Migration 005 snapshots the old identity data to `archive`, renames the old physical table to the minimal UUID bridge, and creates a read-only `students` view over canonical members. It does not delete seating-history UUIDs. If a migration stops, resolve the reported issue and rerun only the migration that did not commit.

Run `database/checks/verify.sql` afterwards. Compare source/destination counts and test a member add/edit/delete, a Rolling participation toggle, a seat assignment, layout save, and reroll before changing any cron schedule.

## 6. Configure Netlify

For the interim release, keep the currently configured Netlify project and Supabase values. This table is a checklist for confirming required names, not an instruction to change project credentials. Reuse the existing website Supabase project URL/keys until the coordinated move.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Destination project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key; never use a publishable key here |
| `SUPABASE_STORAGE_BUCKET` | Existing bucket used by uploads, usually `uploads` |
| `JWT_SECRET` | A newly generated random secret, at least 32 characters |
| `ADMIN_INITIAL_PASSWORD` | Temporary initial admin password, at least 10 characters |
| `VITE_SUPABASE_URL` | Destination project URL used by the public Rolling client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Destination project's publishable key |
| `VITE_API_URL` | Leave unset/empty so the frontend uses same-origin `/api` |
| `CORS_ORIGINS` | Leave unset for same-origin Netlify requests; list exact origins only if a separate frontend needs CORS |

Do not enable any option that exposes server-only variables to browser bundles. The `VITE_` prefix is intentionally limited to the public URL and publishable key.

Deploy the current branch to a **preview deploy** first. Test `/api/health`, `/admin`, public member/gallery reads, uploads, and Rolling. The `/admin` route should survive a direct open and refresh. Check Netlify function logs for missing variables before publishing.

## 7. Admin bootstrap and handover

The server initializes `admin_auth_state` from `ADMIN_INITIAL_PASSWORD` only when that row does not exist. Log in once using that temporary value, change it immediately in Admin → Security & Password, then remove `ADMIN_INITIAL_PASSWORD` from Netlify and redeploy. Existing password hashes remain valid after removing the bootstrap variable.

After deploy, the owner should rotate the Supabase and Netlify account passwords that were shared in chat, enable 2FA, and replace any credentials that may have been reused elsewhere. Never commit `.env` or include keys in support messages.

## 8. Rollback

If a preview fails, do not merge it into production. Roll back the Netlify deploy and restore from the backups if a database operation changed data. Migration 001 moves tables rather than dropping them, but restoring the backup remains the reliable rollback. Keep the old Rolling project and its scheduled job unchanged until the merged site's weekly rotation has been verified.
