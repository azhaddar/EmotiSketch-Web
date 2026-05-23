-- Final trigger fix — run ONE statement at a time in Supabase SQL Editor

-- 1. Transfer ownership to postgres so SECURITY DEFINER bypasses RLS
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 2. Recreate function — reads full_name and role from metadata, DO UPDATE so existing rows get patched
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'parent'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    email     = EXCLUDED.email;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
