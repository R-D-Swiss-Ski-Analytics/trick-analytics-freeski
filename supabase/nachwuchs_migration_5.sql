-- Youth-App · Update 5: Push-Nachrichten + Erinnerung an den Selektions-Stichtag (30. April)
-- Einmal im Supabase-Projekt «Trick Analyses Youth» ausführen: SQL Editor → New query → Run.

-- 1) Push-Abos pro Gerät (ein Profil kann mehrere Geräte haben)
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  lang text not null default 'de',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated
  using (profile_id = public.my_profile_id()) with check (profile_id = public.my_profile_id());

-- 2) Erinnerung: 14, 7 und 1 Tag vor dem Stichtag eine Benachrichtigung an alle Athlet:innen mit Login
--    (die Push-Nachricht verschickt danach die Edge Function «send-push» über den Database Webhook)
create or replace function public.remind_selection_deadline() returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Zurich')::date;
  season_end int := case when extract(month from today) >= 8 then extract(year from today)::int + 1 else extract(year from today)::int end;
  deadline date := make_date(season_end, 4, 30);
  days int := deadline - today;
begin
  if days not in (14, 7, 1) then return; end if;
  insert into notifications (user_id, entry_id, kind, text)
  select p.id, null, 'reminder', 'deadline:' || days
  from profiles p
  where p.role = 'athlete' and p.user_id is not null;
end $$;

-- 3) täglich um 18:00 Schweizer Zeit prüfen (16:00 UTC im Sommer; im Winter 17:00 Schweizer Zeit)
create extension if not exists pg_cron;
select cron.unschedule('youth-deadline-reminder') where exists (select 1 from cron.job where jobname = 'youth-deadline-reminder');
select cron.schedule('youth-deadline-reminder', '0 16 * * *', $$select public.remind_selection_deadline()$$);
