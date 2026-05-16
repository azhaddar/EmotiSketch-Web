-- Ensure therapist can update status (and other fields) for their assigned patients.
-- This consolidates the two therapist UPDATE policies into one clear policy
-- so there is no ambiguity when therapist_id is already set (patient claimed).

DROP POLICY IF EXISTS "patients: therapist update" ON public.patients;
CREATE POLICY "patients: therapist update"
  ON public.patients FOR UPDATE
  USING (
    public.get_my_role() = 'therapist'
    AND (therapist_id = auth.uid() OR therapist_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'therapist'
    AND therapist_id = auth.uid()
  );

-- Drop the old separate claim policy (now covered above)
DROP POLICY IF EXISTS "patients: therapist claim unassigned" ON public.patients;
