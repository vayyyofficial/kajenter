# Database change index

## Live source and compatibility notes

- The website's canonical member roster is `public.members` (`member_type = 'siswa'` for students).
- `public.members` is the single source of student identity. After migration 005, `public.students` is a read-only view over members plus `public.rolling_student_links`; the bridge contains only stable UUIDs and the Rolling-specific active flag required by seating history. The old duplicate names/numbers/nicknames are copied to `archive` and removed from the active schema.
- Class Portal tables are retained in the `archive` schema by migration 001, not deleted.
- The old root-level SQL files are historical bootstrap/migration scripts. They may already have been applied, so do not rename, reorder, or rerun them blindly.

## Deployment migrations

Run only after verified backups, with the order and checks in [`docs/DEPLOY-GUIDE.md`](../docs/DEPLOY-GUIDE.md):

| Order | File | Purpose |
| --- | --- | --- |
| 001 | [`migrations/001-archive-retired-portal.sql`](migrations/001-archive-retired-portal.sql) | Move retired portal/admin tables into `archive`; preserve rows. |
| 002 | [`migrations/002-restrict-public-api.sql`](migrations/002-restrict-public-api.sql) | Replace permissive policies on website tables with public-read-only policies. |
| 003 | [`migrations/003-link-rolling-students.sql`](migrations/003-link-rolling-students.sql) | Link only unambiguous Rolling UUIDs with a unique attendance number and normalized full-name match; manually review the rest. |
| 004 | [`migrations/004-fix-active-seating-rpc.sql`](migrations/004-fix-active-seating-rpc.sql) | Correct the active seating RPC cycle ID without rewriting old migration history. |
| 005 | [`migrations/005-normalize-rolling-students.sql`](migrations/005-normalize-rolling-students.sql) | Replace duplicate student identity storage with a read-only compatibility view and minimal UUID bridge. |

The copy utility [`scripts/migrate-rolling-data.mjs`](../scripts/migrate-rolling-data.mjs) reads both projects and defaults to a dry run. It only inserts missing UUIDs when `--apply` is explicitly passed, and stops on conflicting IDs. Verify all counts after copying.

## Checks

[`checks/verify.sql`](checks/verify.sql) is read-only. Run [`checks/student-dedupe-preflight.sql`](checks/student-dedupe-preflight.sql) before migrations 003 and 005. Student identity/active-flag writes move through the authenticated API; other Rolling mutations (layouts, seats, rerolls, schedules, groups) retain legacy public write policies and need a separate backend migration.
