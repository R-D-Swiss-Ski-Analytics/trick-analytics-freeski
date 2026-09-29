-- Youth-App · Update 13: Kudos vom Coach (3 Vorschläge + eigene Nachricht) und Saison-Rückblick
-- Darf mehrmals ausgeführt werden.
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.

-- 1) Kudos: ein Coach kann einen bewerteten Trick mit «Stark!» auszeichnen
alter table public.entries add column if not exists kudos_at timestamptz;
alter table public.entries add column if not exists kudos_by uuid references public.profiles on delete set null;
alter table public.entries add column if not exists kudos_kind text;   -- well_done | progress | style
alter table public.entries add column if not exists kudos_msg text;    -- optionale eigene Nachricht des Coaches

create or replace function public.entry_kudos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kudos_at is distinct from old.kudos_at or new.kudos_by is distinct from old.kudos_by
     or new.kudos_kind is distinct from old.kudos_kind or new.kudos_msg is distinct from old.kudos_msg then
    -- nur Coaches und Admins dürfen Kudos geben oder zurücknehmen
    if auth.uid() is not null and coalesce(public.my_role(), '') not in ('coach', 'dvlp') then
      raise exception 'Only coaches can give kudos';
    end if;
    if new.kudos_at is not null and old.kudos_at is null then
      -- Text: Art|Trick|Nachricht (App und Push setzen daraus die Nachricht in der Sprache der Athlet:in zusammen)
      insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'kudos', coalesce(new.kudos_kind, 'well_done') || '|' || new.label || '|' || coalesce(new.kudos_msg, ''));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists entries_kudos on public.entries;
create trigger entries_kudos before update on public.entries
  for each row execute function public.entry_kudos();

-- 2) Saison-Rückblick: am 1. Mai um 08:00 (Schweizer Zeit) Push an alle Athlet:innen mit Login
select cron.unschedule('season_review') where exists (select 1 from cron.job where jobname = 'season_review');
select cron.schedule('season_review', '0 6 1 5 *', $$
  insert into public.notifications (user_id, kind, text)
  select id, 'review', 'season' from public.profiles where role = 'athlete' and user_id is not null
$$);
