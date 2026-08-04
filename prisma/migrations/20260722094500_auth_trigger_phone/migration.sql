-- Ensure new auth users get full_name and phone from signup metadata.

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

  INSERT INTO public.users (id, email, full_name, phone, role_id, is_active, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, ''), '@', 1)),
    NULLIF(new.raw_user_meta_data->>'phone', ''),
    learner_role_id,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;
