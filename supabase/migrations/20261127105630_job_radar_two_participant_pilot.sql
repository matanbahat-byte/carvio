-- Two-participant pilot, still OFF. No users enrolled and no sends enabled.
begin;
update public.job_radar_pilot_control set enabled=false,approved_cohort_size=0,daily_limit=2 where singleton;
alter table public.job_radar_pilot_control alter column daily_limit set default 2;
alter table public.job_radar_pilot_control add constraint radar_two_participant_daily_limit check(daily_limit between 1 and 2);
alter table public.job_radar_pilot_control add constraint radar_two_participant_cohort_size check(approved_cohort_size in (0,2));
create or replace function radar_private.validate_pilot_control() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.enabled and (new.approved_cohort_size<>2
  or (select count(*) from public.job_radar_pilot_members where active)<>new.approved_cohort_size
  or exists(select 1 from public.job_radar_pilot_members m left join public.job_radar_preferences p on p.user_id=m.user_id
   where m.active and (not p.enabled or p.revoked_at is not null or p.consent_version<>'job-radar-v1' or not radar_private.pilot_verified(m.user_id)))) then
  raise exception 'Exactly two verified explicitly consented pilot members required';
 end if;
 return new;
end $$;
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
  if c.enabled is distinct from true or c.approved_cohort_size is distinct from 2
   or not exists(select 1 from public.job_radar_pilot_members where user_id=d.user_id and active)
   or (select count(*) from public.job_radar_pilot_members where active)>2
   or not radar_private.pilot_verified(d.user_id)
   or (select count(*) from public.job_radar_dispatches where mode='live' and slot_date=d.slot_date and state in ('sending','sent','unknown'))>=c.daily_limit
   then return false;end if;
  update public.job_radar_dispatches set state='sending',send_started_at=clock_timestamp() where id=d.id;end if;
 insert into public.job_radar_dispatch_events(dispatch_id,event,code) values(d.id,'authorised',case when d.mode='dry-run' then 'dry_run_only' else 'final_consent_check' end);return true;
end $$;

commit;
