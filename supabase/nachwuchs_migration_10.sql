-- Youth-App · Update 10: einzelne Athlet:innen zusätzlich für Coaches aus einem anderen Club freigeben
-- (z.B. Athlet:in im Club A, betreut aber auch von einem Coach aus Club B). Setzt Update 9 voraus.
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.

alter table public.profiles add column if not exists extra_coach_ids uuid[] not null default '{}';

create or replace function public.can_see_athlete(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me
    where me.user_id = auth.uid() and (
      me.role = 'dvlp'
      or a = me.id
      or (me.role = 'coach' and me.group_id is not null
          and public.in_my_groups((select group_id from profiles where id = a)))
      or (me.role = 'coach' and me.id = any ((select extra_coach_ids from profiles where id = a)))
    )
  )
$$;

-- Sessions: Coaches sehen alle Sessions, in denen eine ihrer Athlet:innen dabei ist (Versuche anderer bleiben verborgen)
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated using (
  public.my_role() = 'dvlp' or created_by = public.my_profile_id()
  or (public.my_role() = 'coach' and group_id is not null and public.in_my_groups(group_id))
  or (public.my_role() = 'coach' and exists (select 1 from unnest(athlete_ids) a where public.can_see_athlete(a)))
);

-- Nur DVLP/Admins dürfen Rolle, Gruppe, Login-Verknüpfung und Zusatz-Coaches ändern
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(public.my_role(), '') <> 'dvlp'
     and (new.role is distinct from old.role or new.group_id is distinct from old.group_id
          or new.user_id is distinct from old.user_id or new.extra_coach_ids is distinct from old.extra_coach_ids) then
    raise exception 'Only DVLP can change role, group, login link or extra coaches';
  end if;
  return new;
end $$;
