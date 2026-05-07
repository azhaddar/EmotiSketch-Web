-- Run this in: Supabase Dashboard → SQL Editor

create table if not exists public.sketches (
  id          uuid        primary key default gen_random_uuid(),
  patient_id  uuid        not null references public.patients(id) on delete cascade,
  emotion     text        not null check (emotion in ('happy', 'sad', 'angry', 'anxious')),
  notes       text,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- Indexes for faster lookups
create index if not exists sketches_patient_id_idx on public.sketches(patient_id);
create index if not exists sketches_created_at_idx  on public.sketches(created_at desc);
