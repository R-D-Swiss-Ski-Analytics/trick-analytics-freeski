-- ════════════════════════════════════════════════════════════════════════
-- Youth / Skills-Check Freeski — Update 3 (28.9.2026): Funktionen wie Freeski-App
-- Einmal im SQL-Editor des Projekts «Trick Analyses Youth» ausführen.
-- Die App läuft auch ohne dieses Update weiter, die neuen Felder werden dann still weggelassen.
-- ════════════════════════════════════════════════════════════════════════

-- Session: Jump Size + Contest-Resultate (Quali/Final/Rang pro Athlet:in)
alter table public.sessions add column if not exists jump_size text check (jump_size in ('M','L','XL'));
alter table public.sessions add column if not exists results jsonb not null default '{}'::jsonb;

-- Versuche: Resultat direkt (für Run-Builder ohne Kriterien) + Run-Nummer
alter table public.attempts add column if not exists outcome text check (outcome in ('failed','landed','stomped'));
alter table public.attempts add column if not exists run_no integer;

-- Assessment: wann ein Goal erreicht wurde (Timeline «Goals Achieved»)
alter table public.entries add column if not exists achieved_at timestamptz;

-- Monitoring: Coach-Kommentare pro Athlet:in + Trick
create table if not exists public.trick_comments (
  id bigint generated always as identity primary key,
  athlete_id uuid not null references public.profiles on delete cascade,
  trick_key text not null,
  comment text not null,
  created_by uuid references public.profiles on delete set null default public.my_profile_id(),
  created_at timestamptz not null default now()
);
create index if not exists trick_comments_idx on public.trick_comments (athlete_id, trick_key, created_at desc);
alter table public.trick_comments enable row level security;
drop policy if exists trick_comments_select on public.trick_comments;
create policy trick_comments_select on public.trick_comments for select to authenticated
  using (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));
drop policy if exists trick_comments_insert on public.trick_comments;
create policy trick_comments_insert on public.trick_comments for insert to authenticated
  with check (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));
drop policy if exists trick_comments_delete on public.trick_comments;
create policy trick_comments_delete on public.trick_comments for delete to authenticated
  using (created_by = public.my_profile_id() or public.my_role() = 'dvlp');

-- KI-Zusammenfassung (Cache, schreibt nur die Edge Function «trick-status»)
create table if not exists public.trick_status (
  athlete_id uuid not null references public.profiles on delete cascade,
  trick_key text not null,
  status_text text,
  updated_at timestamptz not null default now(),
  primary key (athlete_id, trick_key)
);
alter table public.trick_status enable row level security;
drop policy if exists trick_status_select on public.trick_status;
create policy trick_status_select on public.trick_status for select to authenticated
  using (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));
