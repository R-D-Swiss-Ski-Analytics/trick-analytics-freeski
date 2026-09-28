-- Youth-App · Update 7: Snowboard Youth in derselben App und Datenbank
-- Einmal im Supabase-Projekt «Trick Analyses Youth» ausführen: SQL Editor → New query → Run.
-- Jede Gruppe, Athlet:in und Session trägt die Sportart. Bestehende Daten bleiben Freeski.

alter table public.groups   add column if not exists sport text not null default 'freeski';
alter table public.profiles add column if not exists sport text not null default 'freeski';
alter table public.sessions add column if not exists sport text not null default 'freeski';

do $$ begin
  alter table public.groups   add constraint groups_sport_chk   check (sport in ('freeski','snowboard'));
  alter table public.profiles add constraint profiles_sport_chk check (sport in ('freeski','snowboard'));
  alter table public.sessions add constraint sessions_sport_chk check (sport in ('freeski','snowboard'));
exception when duplicate_object then null; end $$;

create index if not exists profiles_sport_idx on public.profiles (sport);

-- Snowboard-Gruppen später so anlegen (Beispiel):
-- insert into public.groups (name, sport) values ('NLZ Snowboard Ost', 'snowboard');
