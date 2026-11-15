-- Fix the existing get_active_seating() RPC without editing its original
-- migration file (the original may already have been applied elsewhere).
CREATE OR REPLACE FUNCTION public.get_active_seating()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_period RECORD;
  v_assignments JSONB;
  v_empty_seats JSONB;
BEGIN
  SELECT id, cycle_id, roll_type, created_at, layout_id
  INTO v_period
  FROM public.seating_periods
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_period.id IS NULL THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  SELECT COALESCE(jsonb_object_agg(sa.seat_id::TEXT, sa.student_id::TEXT), '{}'::jsonb)
  INTO v_assignments
  FROM public.seating_assignments sa
  WHERE sa.period_id = v_period.id;

  SELECT COALESCE(jsonb_agg(s.id::TEXT), '[]'::jsonb)
  INTO v_empty_seats
  FROM public.seats s
  WHERE s.layout_id = v_period.layout_id
    AND s.is_available = true
    AND s.id NOT IN (
      SELECT sa.seat_id FROM public.seating_assignments sa WHERE sa.period_id = v_period.id
    );

  RETURN jsonb_build_object(
    'active', true,
    'period_id', v_period.id,
    'cycle_id', v_period.cycle_id,
    'roll_type', v_period.roll_type,
    'created_at', v_period.created_at,
    'assignments', v_assignments,
    'empty_seat_ids', v_empty_seats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_seating() TO anon, authenticated, service_role;

-- Preserve an existing schedule if present; otherwise enable the weekly rotation
-- on this consolidated project when pg_cron is available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (
       SELECT 1 FROM cron.job WHERE jobname = 'classrolling-weekly-reroll'
     ) THEN
    PERFORM cron.schedule(
      'classrolling-weekly-reroll',
      '0 23 * * 6',
      'SELECT public.cron_execute_weekly_reroll();'
    );
  END IF;
END $$;
