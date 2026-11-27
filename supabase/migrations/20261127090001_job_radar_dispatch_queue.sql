begin;
create table public.job_radar_dispatches (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 slot_date date not null,
 mode text not null check (mode in ('dry-run','live')),
 preference_version timestamptz not null,
 state text not null default 'claimed' check(state in ('claimed','prepared','sending','dry_run_ready','sent','failed','unknown','skipped','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 send_started_at timestamptz,
 finished_at timestamptz,
 sent_at timestamptz,
 provider_id text,
 reason text,
 unique(user_id,slot_date,mode)
);
create table public.job_radar_reservations (
 user_id uuid not null references auth.users(id) on delete cascade,
 job_id text not null,
 job_url text not null,
 canonical_url text not null,
 mode text not null check(mode in ('dry-run','live')),
 dispatch_id uuid not null references public.job_radar_dispatches(id) on delete cascade,
 primary key(user_id,job_id,mode),
 unique(user_id,canonical_url,mode)
);
create index radar_reservation_dispatch on public.job_radar_reservations(dispatch_id);
create table public.job_radar_dispatch_events (
 id bigint generated always as identity primary key,
 dispatch_id uuid not null references public.job_radar_dispatches(id) on delete cascade,
 event text not null,
 occurred_at timestamptz not null default clock_timestamp(),
 code text not null
);
create index radar_dispatch_event_parent on public.job_radar_dispatch_events(dispatch_id,occurred_at);
alter table public.job_radar_dispatches enable row level security;
alter table public.job_radar_reservations enable row level security;
alter table public.job_radar_dispatch_events enable row level security;
revoke all on public.job_radar_dispatches, public.job_radar_reservations, public.job_radar_dispatch_events from anon,authenticated,service_role;
grant select,insert,update on public.job_radar_dispatches to service_role;
grant select,insert,delete on public.job_radar_reservations to service_role;
grant select,insert on public.job_radar_dispatch_events to service_role;
grant usage on sequence public.job_radar_dispatch_events_id_seq to service_role;
grant select on public.job_radar_preferences to service_role;
create policy radar_dispatch_service on public.job_radar_dispatches for all to service_role using(true) with check(true);
create policy radar_reservation_service on public.job_radar_reservations for all to service_role using(true) with check(true);
create policy radar_event_service on public.job_radar_dispatch_events for all to service_role using(true) with check(true);

create function public.claim_radar_dispatch(p_user uuid,p_slot date,p_mode text,p_version timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare claimed uuid;
begin
 perform 1 from public.job_radar_preferences where user_id=p_user and enabled and revoked_at is null and consent_version='job-radar-v1' and updated_at=p_version for update;
 if not found then return null; end if;
 insert into public.job_radar_dispatches(user_id,slot_date,mode,preference_version) values(p_user,p_slot,p_mode,p_version)
 on conflict(user_id,slot_date,mode) do nothing returning id into claimed;
 if claimed is not null then insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(claimed,'claimed','scheduled_attempt'); end if;
 return claimed;
end $$;

create function public.reserve_radar_jobs(p_dispatch uuid,p_jobs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.job_radar_dispatches; j jsonb;
begin
 -- Lock preference before dispatch, matching the revoke trigger's lock order.
 perform 1 from public.job_radar_preferences where user_id=(select user_id from public.job_radar_dispatches where id=p_dispatch) for update;
 select * into d from public.job_radar_dispatches where id=p_dispatch for update;
 if d.id is null or d.state<>'claimed' then return false; end if;
 if not exists(select 1 from public.job_radar_preferences where user_id=d.user_id and enabled and revoked_at is null and updated_at=d.preference_version and consent_version='job-radar-v1') then
  update public.job_radar_dispatches set state='cancelled',reason='preferences_changed',finished_at=clock_timestamp() where id=d.id;
  insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,'cancelled','preferences_changed');return false;
 end if;
 if jsonb_typeof(p_jobs) is distinct from 'array' or jsonb_array_length(p_jobs) not between 1 and 5 then raise exception 'Invalid jobs'; end if;
 begin
  for j in select value from jsonb_array_elements(p_jobs) loop
   if coalesce(j->>'id','')='' or coalesce(j->>'url','') not like 'https://%' or coalesce(j->>'canonical','') not like 'https://%' then raise exception 'Invalid job'; end if;
   if exists(select 1 from public.job_radar_deliveries where user_id=d.user_id and (job_id=j->>'id' or job_url=j->>'url')) then raise unique_violation; end if;
   insert into public.job_radar_reservations values(d.user_id,j->>'id',j->>'url',j->>'canonical',d.mode,d.id);
  end loop;
 exception when unique_violation then
  update public.job_radar_dispatches set state='skipped',reason='duplicate_jobs',finished_at=clock_timestamp() where id=d.id;
  insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,'skipped','duplicate_jobs');return false;
 end;
 update public.job_radar_dispatches set state='prepared' where id=d.id;
 insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,'prepared','jobs_reserved');return true;
end $$;

create function public.gate_radar_dispatch(p_dispatch uuid,p_version timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.job_radar_dispatches;
begin
 perform 1 from public.job_radar_preferences where user_id=(select user_id from public.job_radar_dispatches where id=p_dispatch) for update;
 select * into d from public.job_radar_dispatches where id=p_dispatch for update;
 if d.id is null or d.state<>'prepared' then return false; end if;
 if not exists(select 1 from public.job_radar_preferences where user_id=d.user_id and enabled and revoked_at is null and updated_at=p_version and updated_at=d.preference_version and consent_version='job-radar-v1') then return false;end if;
 if not exists(select 1 from public.job_radar_reservations where dispatch_id=d.id) then return false;end if;
 if exists(select 1 from public.job_radar_reservations r join public.job_radar_deliveries h on h.user_id=r.user_id and (h.job_id=r.job_id or h.job_url=r.job_url) where r.dispatch_id=d.id) then return false;end if;
 if d.mode='live' then update public.job_radar_dispatches set state='sending',send_started_at=clock_timestamp() where id=d.id;end if;
 insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,'authorised',case when d.mode='dry-run' then 'dry_run_only' else 'final_consent_check' end);return true;
end $$;

create function public.finish_radar_dispatch(p_dispatch uuid,p_state text,p_code text,p_provider text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare d public.job_radar_dispatches;
begin
 select * into d from public.job_radar_dispatches where id=p_dispatch for update;
 if d.id is null then raise exception 'Unknown dispatch';end if;
 if p_state not in ('dry_run_ready','sent','failed','unknown','skipped','cancelled') or p_code !~ '^[a-z0-9_:-]{1,150}$' then raise exception 'Invalid outcome';end if;
 if d.state in ('sent','dry_run_ready','failed','unknown','skipped','cancelled') then return;end if;
 if p_state='sent' and (d.mode<>'live' or d.state<>'sending' or coalesce(p_provider,'')='') then raise exception 'Confirmed Gmail acceptance required';end if;
 if p_state='unknown' and (d.mode<>'live' or d.state<>'sending') then raise exception 'Invalid uncertain state';end if;
 if p_state='dry_run_ready' and (d.mode<>'dry-run' or d.state<>'prepared') then raise exception 'Invalid simulation';end if;
 if p_state='sent' then
  insert into public.job_radar_deliveries(user_id,job_id,job_url) select user_id,job_id,job_url from public.job_radar_reservations where dispatch_id=d.id on conflict do nothing;
 end if;
 if p_state in ('cancelled','failed') and d.state in ('claimed','prepared') then delete from public.job_radar_reservations where dispatch_id=d.id;end if;
 update public.job_radar_dispatches set state=p_state,reason=p_code,provider_id=p_provider,finished_at=clock_timestamp(),sent_at=case when p_state='sent' then clock_timestamp() end where id=d.id;
 insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,p_state,p_code);
end $$;

revoke all on function public.claim_radar_dispatch(uuid,date,text,timestamptz),public.reserve_radar_jobs(uuid,jsonb),public.gate_radar_dispatch(uuid,timestamptz),public.finish_radar_dispatch(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_radar_dispatch(uuid,date,text,timestamptz),public.reserve_radar_jobs(uuid,jsonb),public.gate_radar_dispatch(uuid,timestamptz),public.finish_radar_dispatch(uuid,text,text,text) to service_role;

create schema if not exists radar_private;
revoke all on schema radar_private from public,anon,authenticated;
create function radar_private.cancel_pending_dispatches() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (not new.enabled) or old.updated_at is distinct from new.updated_at then
  with cancelled as (
   update public.job_radar_dispatches set state='cancelled',reason='preferences_changed',finished_at=clock_timestamp() where user_id=new.user_id and state in ('claimed','prepared') returning id
  ), released as (delete from public.job_radar_reservations where dispatch_id in(select id from cancelled)) insert into public.job_radar_dispatch_events(dispatch_id,event,code) select id,'cancelled','preferences_changed' from cancelled;
  -- An accepted/in-flight Gmail request cannot be recalled. Preserve its delivery evidence.
  insert into public.job_radar_dispatch_events(dispatch_id,event,code) select id,'consent_changed_inflight','requires_reconciliation' from public.job_radar_dispatches where user_id=new.user_id and state='sending';
 end if;
 return new;
end $$;
revoke all on function radar_private.cancel_pending_dispatches() from public,anon,authenticated,service_role;
create trigger radar_cancel_on_preference_change after update on public.job_radar_preferences for each row execute function radar_private.cancel_pending_dispatches();
commit;
