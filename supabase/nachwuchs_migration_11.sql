-- Youth-App · Update 11: Konto selbst aktivieren (nur mit vorab hinterlegter E-Mail)
-- Coaches und Athlet:innen tippen in der App auf «Erstes Mal hier? Konto aktivieren», bekommen einen Code per Mail
-- und wählen ihr Passwort. Ein Konto entsteht NUR, wenn die E-Mail bereits bei einem Profil hinterlegt ist.
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.

-- 1) Darf diese E-Mail ein Konto aktivieren? (hinterlegt und noch ohne Login)
create or replace function public.can_register(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where lower(email) = lower(trim(p_email)) and user_id is null)
$$;
revoke all on function public.can_register(text) from public;
grant execute on function public.can_register(text) to anon, authenticated;

-- 2) Neue Konten nur für hinterlegte E-Mails; sonst wird das Konto abgelehnt
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set user_id = new.id
    where lower(email) = lower(new.email) and user_id is null;
  if not found then
    raise exception 'E-Mail % ist in der Youth-App nicht freigeschaltet', new.email;
  end if;
  return new;
end $$;
