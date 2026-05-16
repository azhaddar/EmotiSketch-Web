-- Allow therapists to see unassigned patients (so they can claim them)
DROP POLICY IF EXISTS "patients: therapist select unassigned" ON public.patients;
CREATE POLICY "patients: therapist select unassigned"
  ON public.patients FOR SELECT
  USING (public.get_my_role() = 'therapist' AND therapist_id IS NULL);

-- Allow therapists to claim an unassigned patient (set themselves as therapist)
-- USING: row must currently be unassigned
-- WITH CHECK: they can only assign themselves, not another therapist
DROP POLICY IF EXISTS "patients: therapist claim unassigned" ON public.patients;
CREATE POLICY "patients: therapist claim unassigned"
  ON public.patients FOR UPDATE
  USING (public.get_my_role() = 'therapist' AND therapist_id IS NULL)
  WITH CHECK (public.get_my_role() = 'therapist' AND therapist_id = auth.uid());
