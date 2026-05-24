-- 15_drawing_schedule.sql
-- Extend child_events to support therapist-initiated drawing schedule requests
-- Parents can accept or reject; push notification is sent on creation.

-- 1. Widen the event_type CHECK constraint to include drawing_schedule
ALTER TABLE public.child_events
  DROP CONSTRAINT IF EXISTS child_events_event_type_check;

ALTER TABLE public.child_events
  ADD CONSTRAINT child_events_event_type_check
    CHECK (event_type IN ('appointment', 'homework_prompt', 'check_in', 'drawing_schedule'));

-- 2. Add parent response status (only meaningful for drawing_schedule type)
ALTER TABLE public.child_events
  ADD COLUMN IF NOT EXISTS parent_status text NOT NULL DEFAULT 'pending'
    CHECK (parent_status IN ('pending', 'accepted', 'rejected'));

-- 3. Allow guardians to update parent_status on drawing_schedule events for their children
--    (they can only flip the status field, not modify any other column — enforced by WITH CHECK)
DROP POLICY IF EXISTS "guardian_respond_drawing_schedule" ON public.child_events;
CREATE POLICY "guardian_respond_drawing_schedule" ON public.child_events
  FOR UPDATE TO authenticated
  USING (
    event_type = 'drawing_schedule'
    AND child_id IN (
      SELECT id FROM public.patients WHERE guardian_id = auth.uid()
    )
  )
  WITH CHECK (
    event_type = 'drawing_schedule'
    AND child_id IN (
      SELECT id FROM public.patients WHERE guardian_id = auth.uid()
    )
  );
