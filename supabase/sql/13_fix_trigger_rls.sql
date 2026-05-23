-- Fix: trigger INSERT blocked by RLS because auth.uid() is NULL during auth.signUp
-- Run ALL statements in Supabase Dashboard → SQL Editor (one at a time)

-- ── 1. Transfer function ownership to postgres (superuser bypasses RLS) ────────
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- ── 2. Drop the INSERT policy that requires auth.uid() (blocks the trigger) ───
DROP POLICY IF EXISTS "profiles: self insert" ON public.profiles;

-- ── 3. Recreate INSERT policy: allow authenticated users to insert their own row
--       (the trigger uses postgres/service_role which already bypasses RLS)
CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ── 4. Verify the fix ────────────────────────────────────────────────────────
-- After running, test registration. If profile still not created, run:
-- SELECT id, full_name, role, email FROM public.profiles ORDER BY created_at DESC LIMIT 5;
