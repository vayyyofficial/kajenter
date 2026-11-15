-- Run after migrations 001–005 in the destination Supabase project.
-- These checks are read-only and return counts/details for manual comparison.

SELECT 'members_students' AS dataset, count(*) AS row_count
FROM public.members WHERE member_type = 'siswa'
UNION ALL SELECT 'rolling_students_view', count(*) FROM public.students
UNION ALL SELECT 'rolling_uuid_links', count(*) FROM public.rolling_student_links
UNION ALL SELECT 'classroom_layouts', count(*) FROM public.classroom_layouts
UNION ALL SELECT 'seats', count(*) FROM public.seats
UNION ALL SELECT 'seating_periods', count(*) FROM public.seating_periods
UNION ALL SELECT 'seating_assignments', count(*) FROM public.seating_assignments
UNION ALL SELECT 'reroll_history', count(*) FROM public.reroll_history
UNION ALL SELECT 'saved_class_groups', count(*) FROM public.saved_class_groups
UNION ALL SELECT 'archived_student_identity_snapshots', count(*) FROM archive.rolling_student_identity_backup
ORDER BY dataset;

-- Any bridge without a current member or archived snapshot needs investigation.
SELECT l.id, l.member_id, l.is_active
FROM public.rolling_student_links l
LEFT JOIN archive.rolling_student_deleted_members d ON d.rolling_student_id = l.id
WHERE l.member_id IS NULL AND d.rolling_student_id IS NULL;

-- Ensure there is at most one Rolling UUID per canonical member.
SELECT member_id, count(*) AS rolling_rows
FROM public.rolling_student_links
WHERE member_id IS NOT NULL
GROUP BY member_id
HAVING count(*) > 1;

-- Confirm retired tables were retained in archive, not deleted.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'archive'
ORDER BY table_name;
