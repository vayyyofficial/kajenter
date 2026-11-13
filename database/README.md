# Database files (repository index)

This folder is the **index** for SQL that lives at the repository root.
Migration filenames are **not** renamed or moved — they may already have been applied in production.

Canonical documentation: [`docs/DATABASE.md`](../docs/DATABASE.md)

## Files (do not rename)

| Order | Path | Role |
| --- | --- | --- |
| 1 | [`../supabase-schema.sql`](../supabase-schema.sql) | Initial schema + seed |
| 2 | [`../supabase-migration-kas-jadwal-piket.sql`](../supabase-migration-kas-jadwal-piket.sql) | Additive kas / jadwal / piket / stories |
| 3 | [`../supabase-migration-rolling.sql`](../supabase-migration-rolling.sql) | Class Rolling tables, RPC, cron |

Apply only on a **new** environment, in that order. Do not re-run against a live database unless a backend developer has reviewed the scripts (`IF NOT EXISTS` makes them mostly additive, but cron/grants/seeds can still have side effects).

## Rules

- Do not drop, reorder, or rename these files.
- Do not change tables, columns, RLS, triggers, or RPC from the frontend repo as part of UI work.
- Known issues and backend recommendations stay in `docs/DATABASE.md` §9.
