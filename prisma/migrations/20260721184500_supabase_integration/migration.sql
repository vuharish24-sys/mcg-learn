-- Provision an application profile whenever Supabase Auth creates a user.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  learner_role_id text;
BEGIN
  SELECT id INTO learner_role_id FROM public.roles WHERE key = 'LEARNER';

  IF learner_role_id IS NULL THEN
    RAISE EXCEPTION 'LEARNER role is not seeded';
  END IF;

  INSERT INTO public.users (id, email, full_name, role_id, is_active, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, ''), '@', 1)),
    learner_role_id,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Publicly readable thumbnails and PDFs; writes remain server-controlled.
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-content', 'learning-content', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public learning content read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'learning-content');
