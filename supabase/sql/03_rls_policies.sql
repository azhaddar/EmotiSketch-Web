-- Run this in: Supabase Dashboard → SQL Editor
-- IMPORTANT: Run 01_sketches_table.sql first before running this file.

-- ─────────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.sketches enable row level security;

-- ─────────────────────────────────────────────────────────────────
-- Helper: returns the current user's role from profiles
-- ─────────────────────────────────────────────────────────────────
create or replace function public.get_my_role()
returns text
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "profiles: self read"       on public.profiles;
drop policy if exists "profiles: admin read all"  on public.profiles;
drop policy if exists "profiles: self update"     on public.profiles;
drop policy if exists "profiles: admin update"    on public.profiles;

-- Every user can read their own profile
create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

-- Admin can read all profiles (needed for user management page)
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.get_my_role() = 'admin');

-- Users can update their own profile (name, etc.)
create policy "profiles: self update"
  on public.profiles for update
  using (id = auth.uid());

-- Admin can update any profile (for role changes)
create policy "profiles: admin update"
  on public.profiles for update
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "patients: admin full access"         on public.patients;
drop policy if exists "patients: therapist select"          on public.patients;
drop policy if exists "patients: therapist update"          on public.patients;
drop policy if exists "patients: parent select"             on public.patients;
drop policy if exists "patients: parent insert"             on public.patients;

-- Admin has full access
create policy "patients: admin full access"
  on public.patients for all
  using (public.get_my_role() = 'admin');

-- Therapist can view their assigned patients
create policy "patients: therapist select"
  on public.patients for select
  using (public.get_my_role() = 'therapist' and therapist_id = auth.uid());

-- Therapist can update their assigned patients (status, notes, etc.)
create policy "patients: therapist update"
  on public.patients for update
  using (public.get_my_role() = 'therapist' and therapist_id = auth.uid());

-- Parent can view their own children
create policy "patients: parent select"
  on public.patients for select
  using (public.get_my_role() = 'user' and guardian_id = auth.uid());

-- Parent can register their own children
create policy "patients: parent insert"
  on public.patients for insert
  with check (public.get_my_role() = 'user' and guardian_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────
-- SKETCHES
-- ─────────────────────────────────────────────────────────────────
drop policy if exists "sketches: admin full access"  on public.sketches;
drop policy if exists "sketches: therapist select"   on public.sketches;
drop policy if exists "sketches: parent select"      on public.sketches;
drop policy if exists "sketches: mobile insert"      on public.sketches;

-- Admin sees and manages everything
create policy "sketches: admin full access"
  on public.sketches for all
  using (public.get_my_role() = 'admin');

-- Therapist sees sketches for their assigned patients
create policy "sketches: therapist select"
  on public.sketches for select
  using (
    public.get_my_role() = 'therapist' and
    exists (
      select 1 from public.patients p
      where p.id = patient_id and p.therapist_id = auth.uid()
    )
  );

-- Parent sees sketches for their own children
create policy "sketches: parent select"
  on public.sketches for select
  using (
    public.get_my_role() = 'user' and
    exists (
      select 1 from public.patients p
      where p.id = patient_id and p.guardian_id = auth.uid()
    )
  );

-- Mobile app inserts sketches for a child that belongs to the logged-in parent
-- (or a therapist submitting on behalf of their patient)
create policy "sketches: mobile insert"
  on public.sketches for insert
  with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_id
        and (p.guardian_id = auth.uid() or p.therapist_id = auth.uid())
    )
    or public.get_my_role() = 'admin'
  );
