-- Youth-App · Update 9: Coaches sehen ihre Trägerschaft in beiden Sportarten
-- Gruppen mit gleichem Namen (z.B. «RLZ Ski Valais (SVAL)» bei Freeski und bei Snowboard) gelten als dieselbe Trägerschaft.
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.

-- Gehört Gruppe g zur Trägerschaft des eingeloggten Coaches (gleicher Gruppenname, egal welche Sportart)?
create or replace function public.in_my_groups(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me
    join groups mine on mine.id = me.group_id
    join groups other on other.name = mine.name
    where me.user_id = auth.uid() and other.id = g
  )
$$;

create or replace function public.can_see_athlete(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me
    where me.user_id = auth.uid() and (
      me.role = 'dvlp'
      or a = me.id
      or (me.role = 'coach' and me.group_id is not null
          and public.in_my_groups((select group_id from profiles where id = a)))
    )
  )
$$;

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (
  public.my_role() = 'dvlp'
  or (public.my_role() = 'coach' and role = 'athlete' and public.in_my_groups(group_id))
);

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated using (
  public.my_role() = 'dvlp' or created_by = public.my_profile_id()
  or (public.my_role() = 'coach' and group_id is not null and public.in_my_groups(group_id))
  or (source = 'elite' and public.my_role() = 'coach'
      and exists (select 1 from unnest(athlete_ids) a where public.can_see_athlete(a)))
);
drop policy if exists sessions_write on public.sessions;
create policy sessions_write on public.sessions for all to authenticated using (
  source <> 'elite' and (
    public.my_role() = 'dvlp' or created_by = public.my_profile_id()
    or (public.my_role() = 'coach' and group_id is not null and public.in_my_groups(group_id)))
) with check (source <> 'elite' and public.my_role() in ('coach','dvlp'));
