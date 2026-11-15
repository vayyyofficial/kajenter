-- Keep only the directory/content reads public. The Express service uses the
-- service-role key, which bypasses RLS; public/anon clients get no write access.
-- Apply after reviewing the site's intended public member fields.
BEGIN;

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'members', 'gallery', 'social_media', 'website_settings',
    'admin_auth_state', 'activity_logs'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOR policy_name IN
        SELECT pol.polname
        FROM pg_policy pol
        WHERE pol.polrelid = to_regclass(format('public.%I', table_name))
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
      END LOOP;
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    END IF;
  END LOOP;
END $$;

GRANT SELECT ON TABLE public.members, public.gallery, public.social_media, public.website_settings TO anon, authenticated;

CREATE POLICY "public_read_members" ON public.members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_gallery" ON public.gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_social_media" ON public.social_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_website_settings" ON public.website_settings FOR SELECT TO anon, authenticated USING (true);

-- The Express service uses service_role, which bypasses RLS. Public clients may
-- read uploaded images but may not write, delete, or list other storage objects.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Full access to uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Public access to uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Public read storage images" ON storage.objects;
    DROP POLICY IF EXISTS "Service role upload storage images" ON storage.objects;
    CREATE POLICY "public_read_uploads" ON storage.objects
      FOR SELECT TO anon, authenticated USING (bucket_id = 'uploads');
  END IF;
END $$;

-- service_role bypasses RLS; do not create a permissive service-role policy.
COMMIT;
