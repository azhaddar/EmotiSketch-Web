-- Allow therapists to update the notes field on sketches for their assigned patients
DROP POLICY IF EXISTS "sketches: therapist update notes" ON public.sketches;

CREATE POLICY "sketches: therapist update notes"
  ON public.sketches FOR UPDATE
  USING (
    public.get_my_role() = 'therapist' AND
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND p.therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'therapist' AND
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND p.therapist_id = auth.uid()
    )
  );
