-- Youth-App · Update 8: Daten der DVLP-Athlet:innen aus den Elite-Apps (Freeski + Snowboard) übernehmen
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.
-- Richtung: nur Elite → Youth. Die Edge Function «sync-elite» schreibt, die App liest.

-- 1) Verknüpfung: Name der Athlet:in in der Elite-App (nur DVLP-Athlet:innen haben einen Eintrag)
alter table public.profiles add column if not exists elite_name text;

-- 2) Herkunft und Elite-ID bei übernommenen Daten
alter table public.entries  add column if not exists source text not null default 'youth';
alter table public.entries  add column if not exists ext_id text;
alter table public.sessions add column if not exists source text not null default 'youth';
alter table public.sessions add column if not exists ext_id text;
alter table public.attempts add column if not exists source text not null default 'youth';
alter table public.attempts add column if not exists ext_id text;
alter table public.attempts add column if not exists ext_rating jsonb;   -- Originalbewertung der Elite-App
create unique index if not exists entries_ext_idx  on public.entries (ext_id);
create unique index if not exists sessions_ext_idx on public.sessions (ext_id);
create unique index if not exists attempts_ext_idx on public.attempts (ext_id);

-- 3) Elite-Sessions: sichtbar für alle, die eine der Athlet:innen sehen dürfen (Gruppe kann später wechseln)
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated using (
  public.my_role() = 'dvlp' or created_by = public.my_profile_id()
  or (public.my_role() = 'coach' and group_id is not null and group_id = public.my_group())
  or (source = 'elite' and public.my_role() = 'coach'
      and exists (select 1 from unnest(athlete_ids) a where public.can_see_athlete(a)))
);
-- Elite-Sessions und -Versuche sind in Youth nur lesbar (geändert wird in der Elite-App)
drop policy if exists sessions_write on public.sessions;
create policy sessions_write on public.sessions for all to authenticated using (
  source <> 'elite' and (
    public.my_role() = 'dvlp' or created_by = public.my_profile_id()
    or (public.my_role() = 'coach' and group_id is not null and group_id = public.my_group()))
) with check (source <> 'elite' and public.my_role() in ('coach','dvlp'));

drop policy if exists attempts_write on public.attempts;
create policy attempts_write on public.attempts for all to authenticated
  using (source <> 'elite' and public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id))
  with check (source <> 'elite' and public.my_role() in ('coach','dvlp') and public.can_see_athlete(athlete_id));

-- 4) Alle 15 Minuten abgleichen: siehe Datei nachwuchs_sync_cron.sql (enthält das Sync-Passwort, NICHT im Repo)
