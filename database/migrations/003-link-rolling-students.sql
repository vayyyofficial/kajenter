-- Preserve Rolling UUIDs referenced by seating assignments while linking each
-- roster row to the canonical public.members record. Never deletes records.
BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS member_id BIGINT REFERENCES public.members(id) ON DELETE SET NULL;

-- Safe automatic matches require both attendance number and normalized name.
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
  'Canonical member record for this legacy Rolling UUID. Identity is read from members; the UUID remains for seating-assignment foreign keys.';

COMMIT;

-- Review unmatched records before continuing. Resolve these manually in Supabase:
-- SELECT s.id, s.number, s.full_name FROM public.students s WHERE s.member_id IS NULL;
