-- Normalize the two student datasets into one canonical record.
-- public.members owns student identity. The old Rolling UUID table becomes a
-- tiny ID/participation bridge because historical assignments reference UUIDs.
-- Identity snapshots go to archive for rollback and old seating history.
BEGIN;

DO $$
DECLARE
  relation_kind "char";
BEGIN
  SELECT c.relkind INTO relation_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'students';

  IF relation_kind IS NULL OR relation_kind <> 'r' THEN
    RAISE EXCEPTION 'Expected public.students to be a base table. Check whether this migration already ran.';
  END IF;

  IF EXISTS (
    SELECT attendance_number
    FROM public.members
    WHERE member_type = 'siswa' AND attendance_number IS NOT NULL
    GROUP BY attendance_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate attendance numbers exist in public.members. Resolve them before deduplication.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students s
    LEFT JOIN public.members m
      ON m.member_type = 'siswa' AND m.attendance_number = s.number
    WHERE m.id IS NULL OR s.member_id IS DISTINCT FROM m.id
  ) THEN
    RAISE EXCEPTION 'Some Rolling rows are unmatched or have an unreviewed identity mismatch. Review the preflight query, verify each student manually, and set the correct member_id before normalizing; nothing was deleted.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.members m
      ON m.member_type = 'siswa' AND m.attendance_number = s.number
    WHERE s.member_id IS NOT NULL AND s.member_id <> m.id
  ) THEN
    RAISE EXCEPTION 'A Rolling row is linked to a different member than its attendance number. Resolve it manually; nothing was deleted.';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA archive TO service_role;

CREATE TABLE IF NOT EXISTS archive.rolling_student_identity_backup (
  rolling_student_id UUID PRIMARY KEY,
  attendance_number INTEGER,
  full_name TEXT NOT NULL,
  nickname TEXT,
  is_active BOOLEAN NOT NULL,
  member_id BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO archive.rolling_student_identity_backup
  (rolling_student_id, attendance_number, full_name, nickname, is_active, member_id, created_at, updated_at)
SELECT id, number, full_name, nickname, is_active, member_id, created_at, updated_at
FROM public.students
ON CONFLICT (rolling_student_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS archive.rolling_student_deleted_members (
  rolling_student_id UUID PRIMARY KEY,
  former_member_id BIGINT NOT NULL,
  attendance_number INTEGER,
  full_name TEXT NOT NULL,
  nickname TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The old table's UUID remains stable; PostgreSQL automatically retargets the
-- seating_assignments and saved_class_groups foreign keys during this rename.
ALTER TABLE public.students RENAME TO rolling_student_links;
ALTER TABLE public.rolling_student_links
  DROP COLUMN number,
  DROP COLUMN full_name,
  DROP COLUMN nickname;

-- A student added through the regular Members admin is automatically enrolled
-- in Rolling. A member changed to teacher is removed from the active roster but
-- the bridge UUID remains for existing history.
CREATE OR REPLACE FUNCTION public.sync_rolling_student_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, archive, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO archive.rolling_student_deleted_members
      (rolling_student_id, former_member_id, attendance_number, full_name, nickname)
    SELECT l.id, OLD.id, OLD.attendance_number, OLD.full_name, OLD.nickname
    FROM public.rolling_student_links l
    WHERE l.member_id = OLD.id
    ON CONFLICT (rolling_student_id) DO UPDATE SET
      former_member_id = EXCLUDED.former_member_id,
      attendance_number = EXCLUDED.attendance_number,
      full_name = EXCLUDED.full_name,
      nickname = EXCLUDED.nickname,
      archived_at = now();

    UPDATE public.rolling_student_links
    SET member_id = NULL, is_active = false, updated_at = now()
    WHERE member_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.member_type = 'siswa' AND NEW.attendance_number IS NOT NULL THEN
    INSERT INTO public.rolling_student_links (member_id, is_active)
    VALUES (NEW.id, true)
    ON CONFLICT (member_id) WHERE member_id IS NOT NULL DO NOTHING;
  ELSIF OLD.member_type = 'siswa' AND OLD.attendance_number IS NOT NULL THEN
    -- Preserve history if a student is reclassified or loses their attendance
    -- number: snapshot identity and detach the UUID before the view stops joining it.
    INSERT INTO archive.rolling_student_deleted_members
      (rolling_student_id, former_member_id, attendance_number, full_name, nickname)
    SELECT l.id, OLD.id, OLD.attendance_number, OLD.full_name, OLD.nickname
    FROM public.rolling_student_links l
    WHERE l.member_id = OLD.id
    ON CONFLICT (rolling_student_id) DO UPDATE SET
      former_member_id = EXCLUDED.former_member_id,
      attendance_number = EXCLUDED.attendance_number,
      full_name = EXCLUDED.full_name,
      nickname = EXCLUDED.nickname,
      archived_at = now();

    UPDATE public.rolling_student_links
    SET member_id = NULL, is_active = false, updated_at = now()
    WHERE member_id = OLD.id;
  ELSE
    UPDATE public.rolling_student_links
    SET is_active = false, updated_at = now()
    WHERE member_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_sync_rolling_student_link ON public.members;
CREATE TRIGGER members_sync_rolling_student_link
AFTER INSERT OR UPDATE OF member_type, attendance_number ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_rolling_student_link();

DROP TRIGGER IF EXISTS members_archive_rolling_student_link ON public.members;
CREATE TRIGGER members_archive_rolling_student_link
BEFORE DELETE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_rolling_student_link();

-- Add bridge rows for canonical students that were not present in the older
-- Rolling list. Existing IDs are never replaced.
INSERT INTO public.rolling_student_links (member_id, is_active)
SELECT id, true
FROM public.members
WHERE member_type = 'siswa' AND attendance_number IS NOT NULL
ON CONFLICT (member_id) WHERE member_id IS NOT NULL DO NOTHING;

-- Remove public write access from the bridge. Writes now go through the main
-- API with the admin session; the public students view is read-only.
DO $$
DECLARE policy_name text;
BEGIN
  FOR policy_name IN
    SELECT pol.polname
    FROM pg_policy pol
    WHERE pol.polrelid = 'public.rolling_student_links'::regclass
  LOOP
    EXECUTE format('DROP POLICY %I ON public.rolling_student_links', policy_name);
  END LOOP;
END $$;
ALTER TABLE public.rolling_student_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rolling_student_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rolling_student_links TO service_role;

CREATE VIEW public.students AS
SELECT
  l.id,
  m.attendance_number AS number,
  m.full_name,
  COALESCE(m.nickname, m.full_name) AS nickname,
  l.is_active,
  m.id AS member_id,
  l.created_at,
  l.updated_at
FROM public.rolling_student_links l
JOIN public.members m ON m.id = l.member_id
WHERE m.member_type = 'siswa'
UNION ALL
SELECT
  l.id,
  d.attendance_number AS number,
  d.full_name,
  COALESCE(d.nickname, d.full_name) AS nickname,
  false AS is_active,
  NULL::BIGINT AS member_id,
  l.created_at,
  l.updated_at
FROM public.rolling_student_links l
JOIN archive.rolling_student_deleted_members d ON d.rolling_student_id = l.id
WHERE l.member_id IS NULL;

COMMENT ON VIEW public.students IS
  'Read-only compatibility view: student identity comes from public.members; the UUID and active flag are retained for Rolling history.';
GRANT SELECT ON public.students TO anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.students FROM PUBLIC, anon, authenticated;

COMMIT;
