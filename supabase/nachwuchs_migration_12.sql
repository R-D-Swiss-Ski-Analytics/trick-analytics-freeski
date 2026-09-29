-- Youth-App · Update 12: Name, Geschlecht und Stufe der Athlet:innen dürfen nur Admins (DVLP) ändern
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(public.my_role(), '') <> 'dvlp'
     and (new.role is distinct from old.role or new.group_id is distinct from old.group_id
          or new.user_id is distinct from old.user_id or new.extra_coach_ids is distinct from old.extra_coach_ids
          or new.name is distinct from old.name or new.gender is distinct from old.gender or new.level is distinct from old.level) then
    raise exception 'Only admins can change name, gender, level, role, group, login link or extra coaches';
  end if;
  return new;
end $$;
