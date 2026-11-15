# Revision notes — backend and database deployment

This branch layers backend and deployment work on the repository's latest frontend revisions.

## Implemented in this branch

- Removed the Express Class Portal and Story route modules; retired API paths return `410 Gone`.
- Removed member-account auto-creation and default-password disclosure from the public member create endpoint. Members without an email are stored with an empty value rather than a fake portal email.
- Removed production fallbacks for the Supabase service-role credentials and admin password. Production requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `JWT_SECRET` of at least 32 characters.
- Added a persistent five-failure / ten-minute admin lockout, password-change token invalidation, and an explicit environment-only bootstrap password.
- Restricted CORS to explicitly configured origins; same-origin hosting does not need cross-origin access.
- Added the Netlify Express function, SPA and API redirects, plus a Supabase two-project copy utility with a read-only default.
- Added additive migrations to archive legacy portal/admin tables, restrict direct writes to website tables, and link Rolling UUID records to canonical members without deleting dependent IDs.
- Removed committed frontend Supabase fallback values. Provide the public URL and publishable key through build-time variables.

## Important scope limits

- No query, SQL migration, or deploy was run against either live Supabase project or Netlify. Follow `docs/DEPLOY-GUIDE.md` and verify the preview before publishing.
- Rolling retains its legacy public write policies until every mutation is moved behind authenticated backend endpoints.
- Rolling UUID rows remain as compatibility records; they are not dropped because existing seating assignments reference them.
- Public member reads include fields currently requested to remain visible. Review that data policy if the owner's preference changes.

## Validation completed

- `npm run build` — passed, including the added server type-check.
- `npm run lint` — passed with 27 existing/style warnings and no errors.
- Local SQLite/API smoke test — passed: 20 demo students seeded, admin login/session works, password change invalidates the old token, old member tokens are rejected for admin writes, retired endpoints return 410, and `/admin` deep-link fallback works.
- Netlify function handler smoke test — `/api/health` returned 200 using placeholder environment values.
- `node --check scripts/migrate-rolling-data.mjs` and `git diff --check` — passed.

Not tested: SQL execution against PostgreSQL, copying either real Supabase project, the real Netlify site, or actual production data. Those checks require the owner to follow `docs/DEPLOY-GUIDE.md` in a preview deployment.
