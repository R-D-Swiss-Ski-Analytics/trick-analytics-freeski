-- Moguls-App: Videos im Assessment
-- Im Supabase-Projekt der Moguls-App einmal ausführen: SQL Editor → New query → Run.
-- Hinweis: Die Moguls-App hat kein Login. Der Video-Speicher ist deshalb wie die übrigen Moguls-Daten
-- für die App ohne Anmeldung zugänglich (Bucket selbst ist privat, Videos nur über kurzlebige Links).

alter table public.standort add column if not exists video_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trick-videos', 'trick-videos', false, 524288000, array['video/*'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists moguls_videos_select on storage.objects;
create policy moguls_videos_select on storage.objects for select to anon, authenticated using (bucket_id = 'trick-videos');
drop policy if exists moguls_videos_insert on storage.objects;
create policy moguls_videos_insert on storage.objects for insert to anon, authenticated with check (bucket_id = 'trick-videos');
drop policy if exists moguls_videos_delete on storage.objects;
create policy moguls_videos_delete on storage.objects for delete to anon, authenticated using (bucket_id = 'trick-videos');
