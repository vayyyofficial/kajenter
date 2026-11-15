# Frontend and Rolling integration notes

## Admin session

- Website and Rolling administration share `/admin` and the main admin session.
- The frontend keeps the returned JWT in memory, not local/session storage. Refreshing or leaving the admin route ends that in-memory session.
- Server-side admin tokens include a credential version tied to the saved password-change timestamp. Changing the password invalidates existing tokens.
- Server login lockout is stored in `admin_auth_state`: five consecutive failures lock login for ten minutes. The initial password comes from `ADMIN_INITIAL_PASSWORD`; production has no default fallback.

## Canonical students and Rolling UUID compatibility

`members` is the sole source for a student's name, nickname, and attendance number. Migration 005 replaces the duplicate `students` table with a read-only view and keeps only `id`, `member_id`, and the Rolling-specific `is_active` flag in `rolling_student_links`. The stable UUID is necessary because existing seating assignments and groups reference it. Old Rolling identity columns are snapshotted in `archive` before removal.

The frontend reads the view through the API. Member create/update/delete actions maintain the UUID bridge; Rolling edits use an admin-authenticated API endpoint. Do not manually delete bridge UUIDs while seating history references them.

## Known security boundary

The standard website tables have public read policies and no direct public write policies; Express writes through `SUPABASE_SERVICE_ROLE_KEY`. The student identity/participation bridge now writes through the authenticated API. Layout, seat, reroll, schedule, and group changes still access Supabase from the browser and retain permissive legacy policies. An admin password check in the UI does not secure those tables; move those mutations behind authenticated endpoints before removing their policies.

The public members directory intentionally exposes the email and phone fields at the owner's request. The database policy currently allows reads of the whole members row; reassess that policy if fields such as full birth date should no longer be public.

## Retired Class Portal

The Express `/api/portal/*` and `/api/stories/*` routes have been removed and respond with HTTP 410. Their old database tables are retained in `archive` after migration 001. The website's public member directory, gallery, contact/social links, and Rolling pages remain.
