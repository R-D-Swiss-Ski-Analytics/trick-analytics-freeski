-- Youth-App · Update 4: Änderungsverlauf der Bewertungen (für Selektionen / Rekurse)
-- Einmal im Supabase-Projekt «Trick Analyses Youth» ausführen: SQL Editor → New query → Run.
-- Jede Änderung an Status, Kriterien, Punkten, Coach-Notiz oder Video eines Eintrags wird
-- automatisch protokolliert (wer, wann, was). Das Protokoll kann nicht bearbeitet oder gelöscht werden.

create table if not exists public.entry_log (
  id bigint generated always as identity primary key,
  entry_id uuid not null,                       -- bewusst ohne Fremdschlüssel: Verlauf bleibt auch nach Löschen
  athlete_id uuid not null,
  label text,
  discipline text,
  status text,
  crit jsonb,
  score smallint,
  review_note text,
  video_path text,
  changed_by uuid,                              -- Profil der Person, die geändert hat
  changed_at timestamptz not null default now(),
  action text not null                          -- insert | update | delete
);
create index if not exists entry_log_entry_idx on public.entry_log (entry_id, changed_at);
create index if not exists entry_log_athlete_idx on public.entry_log (athlete_id, changed_at);

create or replace function public.log_entry_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; who uuid;
begin
  r := coalesce(new, old);
  who := coalesce(public.my_profile_id(), case when tg_op = 'DELETE' then null else new.reviewed_by end);
  if tg_op = 'UPDATE' and
     new.status is not distinct from old.status and new.crit is not distinct from old.crit and
     new.score is not distinct from old.score and new.review_note is not distinct from old.review_note and
     new.video_path is not distinct from old.video_path and new.label is not distinct from old.label then
    return new;   -- nichts Bewertungsrelevantes geändert
  end if;
  insert into public.entry_log (entry_id, athlete_id, label, discipline, status, crit, score, review_note, video_path, changed_by, action)
  values (r.id, r.athlete_id, r.label, r.discipline, r.status, r.crit, r.score, r.review_note, r.video_path, who, lower(tg_op));
  return coalesce(new, old);
end $$;

drop trigger if exists entries_log on public.entries;
create trigger entries_log after insert or update or delete on public.entries
  for each row execute function public.log_entry_change();

alter table public.entry_log enable row level security;
-- lesen: wer die Athlet:in sehen darf (Athlet:in selbst, Coach der Gruppe, DVLP/Admin); schreiben nur per Trigger
drop policy if exists entry_log_select on public.entry_log;
create policy entry_log_select on public.entry_log for select to authenticated
  using (public.can_see_athlete(athlete_id));

-- Startpunkt: heutigen Stand aller Einträge einmalig ins Protokoll übernehmen
insert into public.entry_log (entry_id, athlete_id, label, discipline, status, crit, score, review_note, video_path, changed_by, changed_at, action)
select id, athlete_id, label, discipline, status, crit, score, review_note, video_path, reviewed_by, coalesce(reviewed_at, updated_at, created_at), 'baseline'
from public.entries e
where not exists (select 1 from public.entry_log l where l.entry_id = e.id);
