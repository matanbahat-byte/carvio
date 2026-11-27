-- Isolated development only. Default OFF; no real cohort is enrolled by this migration.
begin;
create table public.job_radar_pilot_control (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 approved_cohort_size smallint not null default 0 check(approved_cohort_size between 0 and 10),
 daily_limit smallint not null default 10 check(daily_limit between 1 and 10)
);
insert into public.job_radar_pilot_control(singleton) values(true);
create table public.job_radar_pilot_members (
 user_id uuid primary key references public.job_radar_preferences(user_id) on delete cascade,
 active boolean not null default true,
 enrolled_at timestamptz not null default clock_timestamp()
);
alter table public.job_radar_pilot_control enable row level security;
alter table public.job_radar_pilot_members enable row level security;
revoke all on public.job_radar_pilot_control,public.job_radar_pilot_members from public,anon,authenticated;
grant select,update on public.job_radar_pilot_control to service_role;
grant select,insert,update,delete on public.job_radar_pilot_members to service_role;
grant select on public.job_radar_consent_events to service_role;
create policy radar_pilot_control_service on public.job_radar_pilot_control for all to service_role using(true) with check(true);
create policy radar_pilot_members_service on public.job_radar_pilot_members for all to service_role using(true) with check(true);
create function radar_private.pilot_verified(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and not coalesce(is_anonymous,false));
$$;
revoke all on function radar_private.pilot_verified(uuid) from public,anon,authenticated;
grant usage on schema radar_private to service_role;
grant execute on function radar_private.pilot_verified(uuid) to service_role;
-- Enrollment/configuration is privileged, and cannot be edited while sending is enabled.
create function radar_private.validate_pilot_control() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.enabled and (new.approved_cohort_size not between 5 and 10
  or (select count(*) from public.job_radar_pilot_members where active)<>new.approved_cohort_size
  or exists(select 1 from public.job_radar_pilot_members m left join public.job_radar_preferences p on p.user_id=m.user_id
   where m.active and (not p.enabled or p.revoked_at is not null or p.consent_version<>'job-radar-v1' or not radar_private.pilot_verified(m.user_id)))) then
  raise exception '5-10 verified explicitly consented pilot members required';
 end if;
 return new;
end $$;
create trigger radar_validate_pilot before update on public.job_radar_pilot_control for each row execute function radar_private.validate_pilot_control();
create function radar_private.validate_pilot_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.job_radar_pilot_control where singleton for update;
 if exists(select 1 from public.job_radar_pilot_control where enabled) then raise exception 'Stop pilot before changing cohort';end if;
 if tg_op<>'DELETE' then
  if not exists(select 1 from public.job_radar_preferences where user_id=new.user_id and enabled and revoked_at is null and consent_version='job-radar-v1') or not radar_private.pilot_verified(new.user_id) then raise exception 'Explicit verified consent required';end if;
  return new;
 end if;
 return old;
end $$;
create trigger radar_validate_member before insert or update or delete on public.job_radar_pilot_members for each row execute function radar_private.validate_pilot_member();
create function radar_private.stop_pilot_pending() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.enabled then
  with cancelled as(update public.job_radar_dispatches set state='cancelled',reason='pilot_stopped',finished_at=clock_timestamp() where mode='live' and state in ('claimed','prepared') returning id),
  released as(delete from public.job_radar_reservations where dispatch_id in(select id from cancelled))
  insert into public.job_radar_dispatch_events(dispatch_id,event,code) select id,'cancelled','pilot_stopped' from cancelled;
  insert into public.job_radar_dispatch_events(dispatch_id,event,code) select id,'pilot_stopped_inflight','requires_reconciliation' from public.job_radar_dispatches where mode='live' and state='sending';
 end if;return new;
end $$;
create trigger radar_stop_pilot after update on public.job_radar_pilot_control for each row execute function radar_private.stop_pilot_pending();
revoke all on function radar_private.validate_pilot_control(),radar_private.validate_pilot_member(),radar_private.stop_pilot_pending() from public,anon,authenticated,service_role;
create or replace function public.gate_radar_dispatch(p_dispatch uuid,p_version timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.job_radar_dispatches; c public.job_radar_pilot_control;
begin
 -- Global row serializes live approvals with the emergency stop and daily cap.
 select * into c from public.job_radar_pilot_control where singleton for update;
 perform 1 from public.job_radar_preferences where user_id=(select user_id from public.job_radar_dispatches where id=p_dispatch) for update;
 select * into d from public.job_radar_dispatches where id=p_dispatch for update;
 if d.id is null or d.state<>'prepared' then return false; end if;
 if not exists(select 1 from public.job_radar_preferences where user_id=d.user_id and enabled and revoked_at is null and updated_at=p_version and updated_at=d.preference_version and consent_version='job-radar-v1') then return false;end if;
 if not exists(select 1 from public.job_radar_reservations where dispatch_id=d.id) then return false;end if;
 if exists(select 1 from public.job_radar_reservations r join public.job_radar_deliveries h on h.user_id=r.user_id and (h.job_id=r.job_id or h.job_url=r.job_url) where r.dispatch_id=d.id) then return false;end if;
 if d.mode='live' then
  if not c.enabled or c.approved_cohort_size not between 5 and 10
   or not exists(select 1 from public.job_radar_pilot_members where user_id=d.user_id and active)
   or (select count(*) from public.job_radar_pilot_members where active)>10
   or not radar_private.pilot_verified(d.user_id)
   or (select count(*) from public.job_radar_dispatches where mode='live' and slot_date=d.slot_date and state in ('sending','sent','unknown'))>=c.daily_limit
   then return false;end if;
  update public.job_radar_dispatches set state='sending',send_started_at=clock_timestamp() where id=d.id;end if;
 insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,'authorised',case when d.mode='dry-run' then 'dry_run_only' else 'final_consent_check' end);return true;
end $$;

commit;
