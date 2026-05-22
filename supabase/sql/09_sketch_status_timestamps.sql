ALTER TABLE public.sketches
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
