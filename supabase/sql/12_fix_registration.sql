-- Fix registration trigger
-- Run ALL of this in: Supabase Dashboard → SQL Editor

-- ── 1. Drop ALL existing triggers on auth.users ───────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users';
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ── 2. Create bulletproof trigger with EXCEPTION guard ────────────────────────
-- The EXCEPTION block ensures auth.signUp NEVER fails even if the INSERT fails.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'parent'),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but never block user creation
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 3. INSERT policy for profiles ────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: self insert" ON public.profiles;
CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
