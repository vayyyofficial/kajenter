# Database change index

## Live source and compatibility notes

- The website's canonical member roster is `public.members` (`member_type = 'siswa'` for students).
- Rolling's UUID `public.students.id` remains as a compatibility key because existing seat assignments and group history reference it. `member_id` links a matched Rolling row to the canonical member. Do not drop or recreate Rolling UUIDs without a reviewed migration of every foreign key.
- Class Portal tables are retained in the `archive` schema by migration 001, not deleted.
- The old root-level SQL files are historical bootstrap/migration scripts. They may already have been applied, so do not rename, reorder, or rerun them blindly.

## Deployment migrations

Run only after verified backups, with the order and checks in [`docs/DEPLOY-GUIDE.md`](../docs/DEPLOY-GUIDE.md):

| Order | File | Purpose |
| --- | --- | --- |
| 001 | [`migrations/001-archive-retired-portal.sql`](migrations/001-archive-retired-portal.sql) | Move retired portal/admin tables into `archive`; preserve rows. |
| 002 | [`migrations/002-restrict-public-api.sql`](migrations/002-restrict-public-api.sql) | Replace permissive policies on website tables with public-read-only policies. |
| 003 | [`migrations/003-link-rolling-students.sql`](migrations/003-link-rolling-students.sql) | Link exact matches from Rolling UUIDs to canonical `members`; no deletes. |
| 004 | [`migrations/004-fix-active-seating-rpc.sql`](migrations/004-fix-active-seating-rpc.sql) | Correct the active seating RPC cycle ID without rewriting old migration history. |

The copy utility [`scripts/migrate-rolling-data.mjs`](../scripts/migrate-rolling-data.mjs) reads both projects and defaults to a dry run. It only inserts missing UUIDs when `--apply` is explicitly passed, and stops on conflicting IDs. Verify all counts after copying.

## Checks

[`checks/verify.sql`](checks/verify.sql) is read-only. Review unmatched students and table counts manually before publishing. The Rolling schema still has permissive write policies from the legacy setup; removing those safely requires moving every Rolling write behind authenticated API endpoints and is not included here.
