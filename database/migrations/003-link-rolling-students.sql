-- Link legacy Rolling UUID rows only when both the unique attendance number
-- and normalized full name agree. Attendance-number matches with name differences
-- are ambiguous and must be reviewed and linked manually before normalization.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT attendance_number
    FROM public.members
    WHERE member_type = 'siswa' AND attendance_number IS NOT NULL
    GROUP BY attendance_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate student attendance numbers exist in public.members. Resolve them before linking Rolling rows.';
  END IF;
END $$;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS member_id BIGINT REFERENCES public.members(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.students AS s
    JOIN public.members AS m
      ON m.member_type = 'siswa' AND m.attendance_number = s.number
    WHERE s.member_id IS NOT NULL AND s.member_id <> m.id
  ) THEN
    RAISE EXCEPTION 'A Rolling student UUID is already linked to a different member with the same attendance number. Review manually.';
  END IF;
END $$;

UPDATE public.students AS s
SET member_id = m.id
FROM public.members AS m
WHERE m.member_type = 'siswa'
  AND m.attendance_number = s.number
  AND lower(regexp_replace(trim(m.full_name), '[[:space:]]+', ' ', 'g'))
      = lower(regexp_replace(trim(s.full_name), '[[:space:]]+', ' ', 'g'))
  AND s.member_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_member_id_unique
  ON public.students(member_id) WHERE member_id IS NOT NULL;

COMMENT ON COLUMN public.students.member_id IS
  'Canonical members row for this legacy Rolling UUID. The following normalization migration removes duplicate identity fields from the active Rolling table.';

COMMIT;

-- Check for unmatched rows and name differences before migration 005:
-- SELECT s.id, s.number, s.full_name AS old_rolling_name, m.id AS member_id,
--        m.full_name AS canonical_name
-- FROM public.students s
-- LEFT JOIN public.members m ON m.member_type = 'siswa' AND m.attendance_number = s.number
-- WHERE m.id IS NULL OR lower(trim(s.full_name)) <> lower(trim(m.full_name));
