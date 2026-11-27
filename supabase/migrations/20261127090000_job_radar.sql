-- Foundation only. No scheduler, sender, or production migration is enabled.
begin;
create table public.job_radar_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  preferences jsonb not null check (jsonb_typeof(preferences) = 'object'),
  frequency_per_week smallint not null check (frequency_per_week in (2,3)),
  language text not null check (language in ('he','en')),
  consent_version text not null check (consent_version = 'job-radar-v1'),
  consented_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not enabled or revoked_at is null)
);
create table public.job_radar_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null,
  preferences jsonb not null,
  frequency_per_week smallint not null,
  language text not null,
  consent_version text not null,
  recorded_at timestamptz not null default now()
);
create index job_radar_events_user on public.job_radar_consent_events(user_id, recorded_at desc);
alter table public.job_radar_preferences enable row level security;
alter table public.job_radar_consent_events enable row level security;
revoke all on public.job_radar_preferences, public.job_radar_consent_events from anon, authenticated;
grant select on public.job_radar_preferences, public.job_radar_consent_events to authenticated;
create policy radar_owner_read on public.job_radar_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy radar_events_owner_read on public.job_radar_consent_events for select to authenticated using (user_id = (select auth.uid()));

-- All mutations are atomic with a server timestamp and append-only consent record.
create function public.save_job_radar_preferences(p_enabled boolean, p_preferences jsonb, p_frequency integer, p_language text, p_consent_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  clean jsonb;
  k text;
begin
  if owner_id is null or not exists (select 1 from auth.users where id = owner_id and email_confirmed_at is not null and coalesce(is_anonymous, false) = false) then
    raise exception 'Verified account required';
  end if;
  if p_enabled = false then
    select preferences, frequency_per_week, language into p_preferences, p_frequency, p_language
    from public.job_radar_preferences where user_id = owner_id;
    if not found then raise exception 'No saved alerts'; end if;
  end if;
  if p_enabled is null or p_frequency is null or p_frequency not in (2,3) or p_language is null or p_language not in ('he','en') or p_consent_version is distinct from 'job-radar-v1' then
    raise exception 'Invalid preferences';
  end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then raise exception 'Invalid search'; end if;
  clean := '{}'::jsonb;
  foreach k in array array['role','country','city','workModel','seniority','employmentType'] loop
    if jsonb_typeof(p_preferences->k) is distinct from 'string' or char_length(p_preferences->>k) > 120 then raise exception 'Invalid search field'; end if;
    clean := clean || jsonb_build_object(k, btrim(p_preferences->>k));
  end loop;
  if clean->>'role' = '' or clean->>'country' = '' then raise exception 'Role and country required'; end if;
  insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at,revoked_at)
  values(owner_id,p_enabled,clean,p_frequency,p_language,p_consent_version,now(),case when not p_enabled then now() end)
  on conflict (user_id) do update set enabled=excluded.enabled, preferences=excluded.preferences,
    frequency_per_week=excluded.frequency_per_week,language=excluded.language,consent_version=excluded.consent_version,
    consented_at=case when p_enabled then now() else public.job_radar_preferences.consented_at end,
    revoked_at=excluded.revoked_at,updated_at=now();
  insert into public.job_radar_consent_events(user_id,enabled,preferences,frequency_per_week,language,consent_version)
  values(owner_id,p_enabled,clean,p_frequency,p_language,p_consent_version);
end;
$$;
revoke all on function public.save_job_radar_preferences(boolean,jsonb,integer,text,text) from public, anon;
grant execute on function public.save_job_radar_preferences(boolean,jsonb,integer,text,text) to authenticated;
commit;
