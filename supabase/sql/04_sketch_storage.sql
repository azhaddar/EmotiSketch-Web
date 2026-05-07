-- Run this in: Supabase Dashboard → SQL Editor

-- Create public bucket for sketch images
insert into storage.buckets (id, name, public)
values ('sketch-images', 'sketch-images', true)
on conflict (id) do nothing;

-- Allow authenticated users (parents) to upload
create policy "Authenticated users can upload sketch images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sketch-images');

-- Allow public read (web dashboard + mobile can display images)
create policy "Public read for sketch images"
  on storage.objects for select
  to public
  using (bucket_id = 'sketch-images');

-- Allow authenticated users to delete (e.g. if a sketch is deleted)
create policy "Authenticated users can delete sketch images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'sketch-images');
