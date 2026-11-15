# Deployment and Supabase Consolidation Guide

This guide prepares the current code for Netlify and combines the Rolling data with the website's existing Supabase project. It does not run any operation against a live account. Take a fresh backup of both Supabase projects before starting, and keep the old Rolling project intact until verification is complete.

## 1. What this change does

- Netlify serves the Vite SPA and routes `/api/*` to an Express function.
- The existing admin API rejects the old hard-coded password fallbacks, uses persistent five-attempt / ten-minute lockout state, and invalidates old admin tokens after a password change.
- The website's core tables are public-read only through the Supabase API. The Express API uses the service-role key for its CRUD operations.
- Retired Class Portal tables are moved to the `archive` schema without dropping their data.
- Rolling `students` rows are retained as stable UUIDs because seating assignments reference them. Migration 003 links matching rows to canonical `members` records; it never deletes unmatched data.
- The Rolling tables still have public write policies in the legacy SQL. This is a known, separate security task: fully removing those writes requires routing all Rolling mutations through authenticated server endpoints first.

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

## 5. Apply the numbered migrations

In the destination SQL Editor, run these files **one at a time and in order**:

1. `database/migrations/001-archive-retired-portal.sql`
2. `database/migrations/002-restrict-public-api.sql`
3. `database/migrations/003-link-rolling-students.sql`
4. `database/migrations/004-fix-active-seating-rpc.sql`

The first two are transactional and retain archived rows. The third keeps Rolling UUIDs intact and links only records with an exact attendance-number and normalized-name match. Review the returned unmatched rows from the query at the end of migration 003. Resolve those by hand in `members`/`students`; do not infer identity from a mismatched number or name.

Run `database/checks/verify.sql` afterwards. Also compare source and destination row counts and test a seat assignment, layout save, and reroll before changing any cron schedule.

## 6. Configure Netlify

Connect the repository and set these variables in Netlify's environment settings:

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
