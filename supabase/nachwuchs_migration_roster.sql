-- ════════════════════════════════════════════════════════════════════════
-- Youth / Skills-Check Freeski — Update «Athlet:innen ohne Login» (28.9.2026)
-- Einmal im SQL-Editor des Projekts «Trick Analyses Youth» ausführen,
-- NACH nachwuchs_schema.sql.
--
-- Vorher: jedes Profil = ein Login (profiles.id = auth.users.id).
-- Neu:    Profile existieren auch ohne Login (Kaderliste). Wird später ein Konto
--         mit derselben E-Mail angelegt, verknüpft es sich automatisch (user_id).
-- ════════════════════════════════════════════════════════════════════════

-- 1) Profile vom Login entkoppeln
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists user_id uuid unique references auth.users on delete set null;
alter table public.profiles add column if not exists birthdate date;
update public.profiles p set user_id = p.id
  where p.user_id is null and exists (select 1 from auth.users u where u.id = p.id);
create unique index if not exists profiles_email_idx on public.profiles (lower(email)) where email is not null;

-- 2) Hilfsfunktionen: «ich» = Profil mit meinem Login
create or replace function public.my_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where user_id = auth.uid()
$$;
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where user_id = auth.uid()
$$;
create or replace function public.my_group() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from profiles where user_id = auth.uid()
$$;
create or replace function public.can_see_athlete(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me
    where me.user_id = auth.uid() and (
      me.role = 'dvlp'
      or a = me.id
      or (me.role = 'coach' and me.group_id is not null
          and me.group_id = (select group_id from profiles where id = a))
    )
  )
$$;

-- 3) Standardwerte «erstellt von» = mein Profil
alter table public.entries  alter column created_by set default public.my_profile_id();
alter table public.sessions alter column created_by set default public.my_profile_id();
alter table public.attempts alter column created_by set default public.my_profile_id();

-- 4) Policies, die bisher auth.uid() als Profil-ID nutzten
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  user_id = auth.uid() or public.can_see_athlete(id)
  or (public.my_role() in ('coach','dvlp') and role in ('coach','dvlp'))
);
-- Athlet:innen erfassen: DVLP überall, Coach in der eigenen Gruppe
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (
  public.my_role() = 'dvlp'
  or (public.my_role() = 'coach' and role = 'athlete' and group_id = public.my_group())
);

drop policy if exists entries_insert on public.entries;
create policy entries_insert on public.entries for insert to authenticated with check (
  public.can_see_athlete(athlete_id) and (
    public.my_role() in ('coach','dvlp')
    or (athlete_id = public.my_profile_id() and status in ('goal','pending') and score is null and crit is null)
  )
);
drop policy if exists entries_update_own on public.entries;
create policy entries_update_own on public.entries for update to authenticated
  using (athlete_id = public.my_profile_id() and status in ('goal','pending','rework'))
  with check (athlete_id = public.my_profile_id() and status in ('goal','pending','rework') and score is null and crit is null);
drop policy if exists entries_delete on public.entries;
create policy entries_delete on public.entries for delete to authenticated using (
  (public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id))
  or (athlete_id = public.my_profile_id() and status <> 'reviewed')
);

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = public.my_profile_id());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated using (
  public.my_role() = 'dvlp' or created_by = public.my_profile_id()
  or (public.my_role() = 'coach' and group_id is not null and group_id = public.my_group())
);
drop policy if exists sessions_write on public.sessions;
create policy sessions_write on public.sessions for all to authenticated using (
  public.my_role() = 'dvlp' or created_by = public.my_profile_id()
  or (public.my_role() = 'coach' and group_id is not null and group_id = public.my_group())
) with check (public.my_role() in ('coach','dvlp'));

drop policy if exists videos_delete on storage.objects;
create policy videos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'skills-videos' and (
    ((storage.foldername(name))[1])::uuid = public.my_profile_id()
    or (public.my_role() in ('coach','dvlp') and public.can_see_athlete(((storage.foldername(name))[1])::uuid))
  )
);

-- 5) Trigger anpassen
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(public.my_role(), '') <> 'dvlp'
     and (new.role is distinct from old.role or new.group_id is distinct from old.group_id
          or new.user_id is distinct from old.user_id) then
    raise exception 'Only DVLP can change role, group or login link';
  end if;
  return new;
end $$;

create or replace function public.notify_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ath profiles%rowtype;
  me uuid := public.my_profile_id();
begin
  select * into ath from profiles where id = new.athlete_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    insert into notifications (user_id, entry_id, kind, text)
      select c.id, new.id, 'submitted', ath.name || ': ' || new.label
      from profiles c
      where c.role = 'coach' and c.group_id is not null and c.group_id = ath.group_id
        and c.id is distinct from me;
  elsif new.status = 'reviewed'
        and (tg_op = 'INSERT' or old.status is distinct from 'reviewed' or old.score is distinct from new.score)
        and new.athlete_id is distinct from me then
    insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'reviewed',
              'Rated ' || new.score || '/' || (case when new.discipline = 'Halfpipe' then 5 else 4 end) || ': ' || new.label);
  elsif tg_op = 'UPDATE' and new.status = 'rework' and old.status is distinct from 'rework' then
    insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'rework', 'New video requested: ' || new.label);
  end if;
  return new;
end $$;

-- Neues Konto: mit bestehendem Profil (gleiche E-Mail, noch ohne Login) verknüpfen, sonst neues Profil
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set user_id = new.id
    where lower(email) = lower(new.email) and user_id is null;
  if not found then
    insert into public.profiles (user_id, email, name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  end if;
  return new;
end $$;
