-- Freeski- UND Snowboard-App: Videos im Assessment
-- In BEIDEN Supabase-Projekten (Freeski und Snowboard) je einmal ausführen: SQL Editor → New query → Run.

-- 1) Spalte für den Video-Pfad im Assessment
alter table public.standort add column if not exists video_path text;

-- 2) privater Speicher-Bucket für die Videos (max. 500 MB pro Datei)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trick-videos', 'trick-videos', false, 524288000, array['video/*'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 3) Zugriff: nur eingeloggte Coaches (alle Konten dieser App sind Coach-/Staff-Konten)
drop policy if exists trick_videos_select on storage.objects;
create policy trick_videos_select on storage.objects for select to authenticated using (bucket_id = 'trick-videos');
drop policy if exists trick_videos_insert on storage.objects;
create policy trick_videos_insert on storage.objects for insert to authenticated with check (bucket_id = 'trick-videos');
drop policy if exists trick_videos_update on storage.objects;
create policy trick_videos_update on storage.objects for update to authenticated using (bucket_id = 'trick-videos');
drop policy if exists trick_videos_delete on storage.objects;
create policy trick_videos_delete on storage.objects for delete to authenticated using (bucket_id = 'trick-videos');
