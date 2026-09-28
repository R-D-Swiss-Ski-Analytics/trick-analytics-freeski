-- ════════════════════════════════════════════════════════════════════════
-- Skills-Check Freeski (Trick Analyses Nachwuchs) — Datenbank-Schema
-- Einmal im SQL-Editor eines NEUEN Supabase-Projekts ausführen
-- (Org «Swiss-Ski Freestyle», z.B. Name «Trick Analyses Nachwuchs»).
--
-- Rollen (Spalte profiles.role):
--   athlete  sieht und erfasst nur sich selbst, kann sich NICHT selbst bewerten
--   coach    sieht seine Gruppe (profiles.group_id), bewertet, pflegt Level/Geschlecht
--   dvlp     DVLP / Nachwuchsverantwortliche: sehen und dürfen alles
-- ════════════════════════════════════════════════════════════════════════

-- ── Tabellen ────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text,
  role text not null default 'athlete' check (role in ('athlete','coach','dvlp')),
  group_id uuid references public.groups on delete set null,
  gender text check (gender in ('M','W')),
  level text check (level in ('T1','T2','T3','T4')),
  focus text check (focus in ('hp','park')),   -- ab T4: nur Halfpipe bzw. nur Jumps+Rails; leer = alle drei
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles on delete cascade,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  discipline text not null check (discipline in ('Jump','Rail','Halfpipe')),
  trick jsonb not null default '{}'::jsonb,   -- strukturierte Trick-Felder (Richtung, Achse, Rotation, Grab …)
  label text not null,
  status text not null default 'pending' check (status in ('goal','pending','rework','reviewed')),
  note text,                                  -- Notiz der Athlet:in
  video_path text,                            -- Pfad im Storage-Bucket skills-videos
  crit jsonb,                                 -- Coach-Bewertung pro Kriterium, z.B. {"takeoff":true,"trick":true,"grab":false,"landing":true}
  score smallint check (score between 0 and 5),   -- Jumps/Rails max 4, Halfpipe max 5 (+ Amplitude)
  review_note text,
  reviewed_by uuid references public.profiles on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_athlete_idx on public.entries (athlete_id);
create index entries_status_idx on public.entries (status);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  entry_id uuid references public.entries on delete cascade,
  kind text not null,          -- submitted | reviewed | rework
  text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Session-Erfassung (Coach): eine Zeile pro Training, eine Zeile pro Versuch
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  group_id uuid references public.groups on delete set null,
  date date not null default current_date,
  type text not null,
  location text,
  duration_min integer,
  conditions smallint check (conditions between 1 and 5),
  comments text,
  athlete_ids uuid[] not null default '{}',
  athlete_notes jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz                          -- leer = Session läuft noch
);
create index sessions_date_idx on public.sessions (date desc);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  athlete_id uuid not null references public.profiles on delete cascade,
  discipline text not null check (discipline in ('Jump','Rail','Halfpipe')),
  trick jsonb not null default '{}'::jsonb,
  label text not null,
  crit jsonb,
  score smallint check (score between 0 and 5),
  max smallint,
  fell boolean not null default false,
  note text,
  entry_id uuid references public.entries on delete set null,   -- in den Skills-Check übernommen
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index attempts_session_idx on public.attempts (session_id);
create index attempts_athlete_idx on public.attempts (athlete_id);

-- ── Hilfsfunktionen (security definer, damit RLS nicht rekursiv wird) ───
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.my_group() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from profiles where id = auth.uid()
$$;

create or replace function public.can_see_athlete(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me
    where me.id = auth.uid() and (
      me.role = 'dvlp'
      or a = me.id
      or (me.role = 'coach' and me.group_id is not null
          and me.group_id = (select group_id from profiles where id = a))
    )
  )
$$;

-- ── Row Level Security ─────────────────────────────────────────────────
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.notifications enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;

-- groups: alle Eingeloggten lesen, nur DVLP schreibt
create policy groups_select on public.groups for select to authenticated using (true);
create policy groups_write on public.groups for all to authenticated
  using (public.my_role() = 'dvlp') with check (public.my_role() = 'dvlp');

-- profiles: sich selbst, sichtbare Athlet:innen; Coaches/DVLP sehen zusätzlich das Staff (Namen der Bewertenden)
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.can_see_athlete(id)
  or (public.my_role() in ('coach','dvlp') and role in ('coach','dvlp'))
);
-- Coach: Athlet:innen der eigenen Gruppe (Name/Level/Geschlecht/Fokus); DVLP: alle
create policy profiles_update on public.profiles for update to authenticated using (
  public.my_role() = 'dvlp' or (public.my_role() = 'coach' and role = 'athlete' and public.can_see_athlete(id))
) with check (
  public.my_role() = 'dvlp' or (public.my_role() = 'coach' and role = 'athlete' and public.can_see_athlete(id))
);

-- Schutz: nur DVLP darf Rolle und Gruppe ändern (Coaches nur Level/Geschlecht/Name)
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(), '') <> 'dvlp'
     and auth.uid() is not null
     and (new.role is distinct from old.role or new.group_id is distinct from old.group_id) then
    raise exception 'Only DVLP can change role or group';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- entries
create policy entries_select on public.entries for select to authenticated
  using (public.can_see_athlete(athlete_id));

create policy entries_insert on public.entries for insert to authenticated with check (
  public.can_see_athlete(athlete_id) and (
    public.my_role() in ('coach','dvlp')
    or (athlete_id = auth.uid() and status in ('goal','pending') and score is null and crit is null)
  )
);

create policy entries_update_staff on public.entries for update to authenticated
  using (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id))
  with check (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));

-- Athlet:in: eigene, noch nicht bewertete Einträge ändern / neu einreichen — nie selbst bewerten
create policy entries_update_own on public.entries for update to authenticated
  using (athlete_id = auth.uid() and status in ('goal','pending','rework'))
  with check (athlete_id = auth.uid() and status in ('goal','pending','rework') and score is null and crit is null);

create policy entries_delete on public.entries for delete to authenticated using (
  (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id))
  or (athlete_id = auth.uid() and status <> 'reviewed')
);

-- notifications: nur eigene lesen / als gelesen markieren (erzeugt werden sie per Trigger)
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sessions / attempts: nur Coaches (eigene Gruppe) und DVLP
create policy sessions_select on public.sessions for select to authenticated using (
  public.my_role() = 'dvlp' or created_by = auth.uid()
  or (public.my_role() = 'coach' and group_id is not null and group_id = public.my_group())
);
create policy sessions_write on public.sessions for all to authenticated using (
  public.my_role() = 'dvlp' or created_by = auth.uid()
  or (public.my_role() = 'coach' and group_id is not null and group_id = public.my_group())
) with check (public.my_role() in ('coach','dvlp'));

create policy attempts_select on public.attempts for select to authenticated
  using (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));
create policy attempts_write on public.attempts for all to authenticated
  using (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id))
  with check (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));

-- ── Trigger ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- Nachrichten: eingereicht → alle Coaches der Gruppe; bewertet / neues Video nötig → Athlet:in
create or replace function public.notify_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ath profiles%rowtype;
begin
  select * into ath from profiles where id = new.athlete_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    insert into notifications (user_id, entry_id, kind, text)
      select c.id, new.id, 'submitted', ath.name || ': ' || new.label
      from profiles c
      where c.role = 'coach' and c.group_id is not null and c.group_id = ath.group_id
        and c.id is distinct from auth.uid();
  elsif new.status = 'reviewed'
        and (tg_op = 'INSERT' or old.status is distinct from 'reviewed' or old.score is distinct from new.score)
        and new.athlete_id is distinct from auth.uid() then
    insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'reviewed',
              'Rated ' || new.score || '/' || (case when new.discipline = 'Halfpipe' then 5 else 4 end) || ': ' || new.label);
  elsif tg_op = 'UPDATE' and new.status = 'rework' and old.status is distinct from 'rework' then
    insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'rework', 'New video requested: ' || new.label);
  end if;
  return new;
end $$;
create trigger entries_notify after insert or update on public.entries
  for each row execute function public.notify_entry();

-- Neues Konto (Invite im Dashboard) → Profil als Athlet:in; DVLP weist danach Rolle/Gruppe/Level zu
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage: Videos (privat, Pfad = <athlete_id>/<entry_id>-<zeit>.<ext>) ─
insert into storage.buckets (id, name, public, file_size_limit)
values ('skills-videos', 'skills-videos', false, 524288000)   -- 500 MB pro Datei (PRO-Plan)
on conflict (id) do nothing;

create policy videos_select on storage.objects for select to authenticated using (
  bucket_id = 'skills-videos' and public.can_see_athlete(((storage.foldername(name))[1])::uuid)
);
create policy videos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'skills-videos' and public.can_see_athlete(((storage.foldername(name))[1])::uuid)
);
create policy videos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'skills-videos' and (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    or (public.my_role() in ('coach','dvlp') and public.can_see_athlete(((storage.foldername(name))[1])::uuid))
  )
);

-- ── Nach dem Ausführen ──────────────────────────────────────────────────
-- 1) Authentication → Sign In / Providers: «Allow new users to sign up» AUS.
-- 2) Gruppen anlegen:  insert into groups (name) values ('TG DVLP Dominic');
-- 3) Eigenes Konto einladen (Authentication → Users → Invite), dann zur DVLP machen:
--      update profiles set role = 'dvlp', name = 'Emilie Benz' where email = '<deine Mail>';
-- 4) Coaches + Athlet:innen einladen; Rolle/Gruppe/Level/Geschlecht im Team-Tab der App setzen.
-- 5) Mail-Template «Reset password» auf {{ .Token }} umstellen (wie bei SB/FS).
