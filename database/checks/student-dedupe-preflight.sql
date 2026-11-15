-- Read-only preflight before migrations 003 and 005.
-- Every result set should be reviewed before changing the live database.

-- Duplicate canonical student attendance numbers must be resolved first.
SELECT attendance_number, count(*) AS member_rows, array_agg(id ORDER BY id) AS member_ids
FROM public.members
WHERE member_type = 'siswa' AND attendance_number IS NOT NULL
GROUP BY attendance_number
HAVING count(*) > 1
ORDER BY attendance_number;

-- Rolling rows with no member at the same number cannot be auto-merged safely.
SELECT s.id AS rolling_id, s.number, s.full_name AS rolling_name
FROM public.students s
LEFT JOIN public.members m
  ON m.member_type = 'siswa' AND m.attendance_number = s.number
WHERE m.id IS NULL
ORDER BY s.number;

-- Name differences are ambiguous even when attendance numbers match. Review
-- each pair against a trusted roster/source before explicitly linking it.
-- Migration 003 does not auto-link these; migration 005 stops until resolved.
SELECT s.id AS rolling_id, s.number, s.full_name AS old_rolling_name,
       s.member_id AS current_member_id,
       m.id AS attendance_number_member_id, m.full_name AS canonical_name
FROM public.students s
JOIN public.members m
  ON m.member_type = 'siswa' AND m.attendance_number = s.number
WHERE lower(regexp_replace(trim(s.full_name), '[[:space:]]+', ' ', 'g'))
   <> lower(regexp_replace(trim(m.full_name), '[[:space:]]+', ' ', 'g'))
ORDER BY s.number;

-- Existing ambiguous links also need manual review.
SELECT member_id, count(*) AS rolling_rows, array_agg(id ORDER BY id) AS rolling_ids
FROM public.students
WHERE member_id IS NOT NULL
GROUP BY member_id
HAVING count(*) > 1;
