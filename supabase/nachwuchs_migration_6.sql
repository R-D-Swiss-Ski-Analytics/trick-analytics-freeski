-- Youth-App · Update 6: Erinnerung an Admins am 31. Mai (Video-Aufräumen)
-- Einmal im Supabase-Projekt «Trick Analyses Youth» ausführen: SQL Editor → New query → Run.
-- Ergänzt die tägliche Prüfung aus Update 5 (Stichtag-Erinnerung bleibt unverändert).
create or replace function public.remind_selection_deadline() returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Zurich')::date;
  season_end int := case when extract(month from today) >= 8 then extract(year from today)::int + 1 else extract(year from today)::int end;
  deadline date := make_date(season_end, 4, 30);
  days int := deadline - today;
begin
  if days in (14, 7, 1) then
    insert into notifications (user_id, entry_id, kind, text)
    select p.id, null, 'reminder', 'deadline:' || days
    from profiles p where p.role = 'athlete' and p.user_id is not null;
  end if;
  -- 31. Mai: DVLP/Admins ans Video-Aufräumen erinnern
  if extract(month from today) = 5 and extract(day from today) = 31 then
    insert into notifications (user_id, entry_id, kind, text)
    select p.id, null, 'cleanup', 'cleanup'
    from profiles p where p.role = 'dvlp' and p.user_id is not null;
  end if;
end $$;
