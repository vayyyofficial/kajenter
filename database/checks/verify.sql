-- Run after migrations 001–003 in the destination Supabase project.
-- These checks are read-only and return counts/details for manual comparison.

SELECT 'members' AS table_name, count(*) AS row_count FROM public.members
UNION ALL SELECT 'students', count(*) FROM public.students
UNION ALL SELECT 'classroom_layouts', count(*) FROM public.classroom_layouts
UNION ALL SELECT 'seats', count(*) FROM public.seats
UNION ALL SELECT 'seating_periods', count(*) FROM public.seating_periods
UNION ALL SELECT 'seating_assignments', count(*) FROM public.seating_assignments
UNION ALL SELECT 'reroll_history', count(*) FROM public.reroll_history
UNION ALL SELECT 'saved_class_groups', count(*) FROM public.saved_class_groups
ORDER BY table_name;

-- Any rows here need a human match before they can use the canonical member name.
SELECT id, number, full_name
FROM public.students
WHERE member_id IS NULL
ORDER BY number;

-- Confirm retired tables were retained in archive and removed from public.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'archive'
ORDER BY table_name;

-- Check for duplicate canonical links.
SELECT member_id, count(*) AS rolling_rows
FROM public.students
WHERE member_id IS NOT NULL
GROUP BY member_id
HAVING count(*) > 1;
