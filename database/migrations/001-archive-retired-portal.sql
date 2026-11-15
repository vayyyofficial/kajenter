-- Archive retired Class Portal tables without deleting their data.
-- Run only after taking a verified database backup. This migration is idempotent.
BEGIN;

CREATE SCHEMA IF NOT EXISTS archive;
COMMENT ON SCHEMA archive IS 'Retired Class Portal/admin data retained for recovery; not used by the website.';
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA archive TO service_role;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'member_accounts', 'verification_codes', 'class_kas_records',
    'class_kas_weeks', 'class_kas_expenses', 'class_tasks',
    'class_schedules', 'piket_schedules', 'member_stories',
    'users', 'roles_permissions'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL
       AND to_regclass(format('archive.%I', table_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', table_name);
    END IF;
  END LOOP;
END $$;

-- Moving the tables also moves their attached policies. Revoke direct API access
-- explicitly so archived records remain backend/service-role only.
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

COMMIT;
