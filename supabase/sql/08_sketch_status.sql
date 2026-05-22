-- Add status tracking to sketches
ALTER TABLE public.sketches
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted'
  CHECK (status IN ('submitted', 'reviewing', 'verified'));
