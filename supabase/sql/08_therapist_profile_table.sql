-- Therapist qualification profiles
CREATE TABLE IF NOT EXISTS public.therapist_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_title      text,
  academic_qualifications text,
  years_of_experience     integer,
  registered_body         text DEFAULT 'Malaysian Board of Counsellors',
  license_number          text,
  bio                     text,
  updated_at              timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read therapist profiles
DROP POLICY IF EXISTS "therapist_profiles: read" ON public.therapist_profiles;
CREATE POLICY "therapist_profiles: read"
  ON public.therapist_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Therapist can update their own profile
DROP POLICY IF EXISTS "therapist_profiles: self update" ON public.therapist_profiles;
CREATE POLICY "therapist_profiles: self update"
  ON public.therapist_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can update any therapist profile
DROP POLICY IF EXISTS "therapist_profiles: admin all" ON public.therapist_profiles;
CREATE POLICY "therapist_profiles: admin all"
  ON public.therapist_profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── Dummy data ────────────────────────────────────────────────────────────────
-- Inserts a profile for the first therapist account found in profiles table.
-- Run this after the table is created. Safe to re-run (ON CONFLICT DO UPDATE).
INSERT INTO public.therapist_profiles (
  id,
  professional_title,
  academic_qualifications,
  years_of_experience,
  registered_body,
  license_number,
  bio
)
SELECT
  p.id,
  'Counselling Psychologist',
  'Master of Counselling, Universiti Kebangsaan Malaysia (UKM); Bachelor of Psychology (Hons.), Universiti Malaya (UM)',
  5,
  'Malaysian Board of Counsellors',
  'KB12211',
  'Specialises in child and adolescent mental health, with a focus on expressive arts therapy and emotional regulation. Committed to supporting children through evidence-based, culturally sensitive counselling approaches.'
FROM public.profiles p
WHERE p.role = 'therapist'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  professional_title      = EXCLUDED.professional_title,
  academic_qualifications = EXCLUDED.academic_qualifications,
  years_of_experience     = EXCLUDED.years_of_experience,
  registered_body         = EXCLUDED.registered_body,
  license_number          = EXCLUDED.license_number,
  bio                     = EXCLUDED.bio,
  updated_at              = now();
