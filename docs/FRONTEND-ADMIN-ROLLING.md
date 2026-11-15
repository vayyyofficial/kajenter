# Frontend and Rolling integration notes

## Admin session

- Website and Rolling administration share `/admin` and the main admin session.
- The frontend keeps the returned JWT in memory, not local/session storage. Refreshing or leaving the admin route ends that in-memory session.
- Server-side admin tokens include a credential version tied to the saved password-change timestamp. Changing the password invalidates existing tokens.
- Server login lockout is stored in `admin_auth_state`: five consecutive failures lock login for ten minutes. The initial password comes from `ADMIN_INITIAL_PASSWORD`; production has no default fallback.

## Canonical students and Rolling UUID compatibility

`members` is the canonical source for a student's name, nickname, and attendance number. Rolling `students` rows retain their UUID because `seating_assignments` and `saved_class_groups` reference those UUIDs. Migration 003 adds a `member_id` link for exact matches. The client prefers this link when composing the Rolling roster, then falls back to attendance number/name for older rows.

Do not delete the compatibility rows or their IDs until every reference and RPC has been migrated in a separately reviewed change. The `students.is_active` flag remains Rolling-specific.

## Known security boundary

The standard website tables have public read policies and no direct public write policies; Express writes through `SUPABASE_SERVICE_ROLE_KEY`. Rolling still accesses Supabase directly from the browser and its existing SQL grants public writes to several Rolling tables. An admin password check in the UI does not secure Supabase itself. A follow-up must route Rolling mutations through authenticated backend endpoints before those write policies can be removed.

The public members directory intentionally exposes the email and phone fields at the owner's request. The database policy currently allows reads of the whole members row; reassess that policy if fields such as full birth date should no longer be public.

## Retired Class Portal

The Express `/api/portal/*` and `/api/stories/*` routes have been removed and respond with HTTP 410. Their old database tables are retained in `archive` after migration 001. The website's public member directory, gallery, contact/social links, and Rolling pages remain.
