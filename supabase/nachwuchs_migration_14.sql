-- Update 14: Skills-Check-Stand für die PISTE App
-- Die Youth App legt pro Athlet:in und Saison die Prozente ab (nur Bewertungen mit Video, wie die Selektion).
-- Die PISTE App holt sie mit ihrer Server-Funktion «sync-youth» ab.
create table if not exists public.skills_snapshot (
  athlete_id uuid not null references public.profiles on delete cascade,
  season text not null,
  level text,
  jumps numeric, rails numeric, hp numeric, total numeric,
  updated_at timestamptz not null default now(),
  primary key (athlete_id, season)
);
alter table public.skills_snapshot enable row level security;
drop policy if exists snap_read on public.skills_snapshot;
drop policy if exists snap_ins on public.skills_snapshot;
drop policy if exists snap_upd on public.skills_snapshot;
create policy snap_read on public.skills_snapshot for select to authenticated using (public.can_see_athlete(athlete_id));
create policy snap_ins on public.skills_snapshot for insert to authenticated
  with check (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));
create policy snap_upd on public.skills_snapshot for update to authenticated
  using (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id))
  with check (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));
