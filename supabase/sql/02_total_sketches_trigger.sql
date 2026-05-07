-- Run this in: Supabase Dashboard → SQL Editor
-- Keeps patients.total_sketches in sync automatically when sketches are added/removed.

create or replace function public.sync_total_sketches()
returns trigger
language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.patients
    set total_sketches = total_sketches + 1
    where id = NEW.patient_id;

  elsif TG_OP = 'DELETE' then
    update public.patients
    set total_sketches = greatest(total_sketches - 1, 0)
    where id = OLD.patient_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_sketch_change on public.sketches;

create trigger on_sketch_change
  after insert or delete on public.sketches
  for each row execute function public.sync_total_sketches();
