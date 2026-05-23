-- child_events: therapist-scheduled events visible to parent on mobile calendar
CREATE TABLE IF NOT EXISTS public.child_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  therapist_id uuid        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  event_type   text        NOT NULL DEFAULT 'appointment'
                           CHECK (event_type IN ('appointment', 'homework_prompt', 'check_in')),
  scheduled_at timestamptz NOT NULL,
  is_notified  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.child_events ENABLE ROW LEVEL SECURITY;

-- Therapists manage their own events
CREATE POLICY "therapist_manage_events" ON public.child_events
  FOR ALL TO authenticated
  USING  (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Guardians read events for their own children
CREATE POLICY "guardian_read_events" ON public.child_events
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT id FROM public.patients WHERE guardian_id = auth.uid()
    )
  );

-- Store Expo push token on the profiles table for push delivery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token text;
