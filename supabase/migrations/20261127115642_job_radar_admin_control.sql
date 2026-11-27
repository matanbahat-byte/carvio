begin;
-- No default administrators or account classifications; privileged provisioning only.
create table radar_private.admin_members(user_id uuid primary key references auth.users(id) on delete cascade,active boolean not null default true);
create table radar_private.account_labels(user_id uuid primary key references auth.users(id) on delete cascade,kind text not null check(kind in ('test','real')));
create table radar_private.admin_actions(id bigint generated always as identity primary key,actor uuid references auth.users(id) on delete set null,action text not null,occurred_at timestamptz not null default clock_timestamp());
alter table radar_private.admin_members enable row level security;
alter table radar_private.account_labels enable row level security;
alter table radar_private.admin_actions enable row level security;
revoke all on radar_private.admin_members,radar_private.account_labels,radar_private.admin_actions from public,anon,authenticated,service_role;
create function radar_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from radar_private.admin_members where user_id=auth.uid() and active) and radar_private.pilot_verified(auth.uid());
$$;
revoke all on function radar_private.is_admin() from public,anon,service_role;
grant execute on function radar_private.is_admin() to authenticated;
create function public.radar_admin_access() returns boolean language sql stable security invoker set search_path='' as $$select radar_private.is_admin();$$;
revoke all on function public.radar_admin_access() from public,anon,service_role;
grant execute on function public.radar_admin_access() to authenticated;
create function radar_private.account_cohort(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from radar_private.account_labels where user_id=p_user and kind='test') then 'test'
 when exists(select 1 from public.job_radar_pilot_members where user_id=p_user) then 'pilot'
 when exists(select 1 from radar_private.account_labels where user_id=p_user and kind='real') then 'real' else 'unclassified' end;
$$;
revoke all on function radar_private.account_cohort(uuid) from public,anon,authenticated,service_role;
-- Persist the existing selector's reserved match count before later cancellation releases jobs.
-- This counts selected matching jobs, never all raw jobs returned by an external source.
alter table public.job_radar_dispatches add column selected_job_count smallint check(selected_job_count between 0 and 5);
update public.job_radar_dispatches d set selected_job_count=(select count(*) from public.job_radar_reservations r where r.dispatch_id=d.id) where exists(select 1 from public.job_radar_reservations r where r.dispatch_id=d.id);
create function radar_private.capture_selected_count() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.state='prepared' and old.state='claimed' then select count(*) into new.selected_job_count from public.job_radar_reservations where dispatch_id=new.id;end if;return new;
end $$;
revoke all on function radar_private.capture_selected_count() from public,anon,authenticated,service_role;
create trigger radar_selected_count before update of state on public.job_radar_dispatches for each row execute function radar_private.capture_selected_count();
create function radar_private.admin_period(p_start date,p_days integer,p_cohort text) returns jsonb language sql stable security definer set search_path='' as $$
 with bounds as(select p_start::timestamp at time zone 'Asia/Jerusalem' as lo,(p_start+p_days)::timestamp at time zone 'Asia/Jerusalem' as hi),
 owners as(select p.user_id,p.enabled,p.revoked_at,p.consent_version from public.job_radar_preferences p where radar_private.account_cohort(p.user_id)=p_cohort),
 dispatch as(select d.* from public.job_radar_dispatches d join owners o on o.user_id=d.user_id where d.mode='live'),
 sent as(select d.* from dispatch d,bounds b where d.state='sent' and d.sent_at>=b.lo and d.sent_at<b.hi),
 actions as(select a.*,s.user_id from public.job_radar_action_events a join sent s on s.id=a.dispatch_id where a.occurred_at>=s.sent_at and a.occurred_at<s.sent_at+interval '168 hours' and a.occurred_at<=now()),
 matched as(select d.* from dispatch d,bounds b where d.created_at>=b.lo and d.created_at<b.hi),
 consents as(select e.* from public.job_radar_consent_events e join owners o on o.user_id=e.user_id,bounds b where e.recorded_at>=b.lo and e.recorded_at<b.hi)
 select jsonb_build_object(
 'enabledNow',(select count(*) from owners where enabled and revoked_at is null and consent_version='job-radar-v1'),
 'activatedUsers',(select count(distinct user_id) from consents where enabled),
 'selectedJobs',case when exists(select 1 from matched where selected_job_count is null and state in ('prepared','sending','sent','unknown')) then null else (select coalesce(sum(selected_job_count),0) from matched) end,
 'sent',(select count(*) from sent),
 'failed',(select count(*) from dispatch d,bounds b where d.state='failed' and d.finished_at>=b.lo and d.finished_at<b.hi),
 'unknown',(select count(*) from dispatch d,bounds b where d.state='unknown' and d.finished_at>=b.lo and d.finished_at<b.hi),
 'clicked',(select count(distinct dispatch_id) from actions where event='clicked'),
 'returned',(select count(distinct user_id) from actions where event='returned'),
 'saved',(select count(distinct dispatch_id) from actions where event='saved'),
 'applied',(select count(distinct dispatch_id) from actions where event='applied'),
 'unsubscribed',(select count(distinct user_id) from consents where not enabled),
 'dryRunReady',(select count(*) from public.job_radar_dispatches d join owners o on o.user_id=d.user_id,bounds b where d.mode='dry-run' and d.state='dry_run_ready' and d.finished_at>=b.lo and d.finished_at<b.hi)
 );
$$;
revoke all on function radar_private.admin_period(date,integer,text) from public,anon,authenticated,service_role;
create function radar_private.admin_summary(p_start date,p_days integer,p_cohort text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not radar_private.is_admin() then raise insufficient_privilege using message='Administrator required';end if;
 if p_start is null or p_days is null or p_days not in(1,7) or p_cohort is null or p_cohort not in('pilot','test','real','unclassified') or p_start>current_date+1 or p_start<date '2026-01-01' then raise exception 'Invalid reporting window';end if;
 return jsonb_build_object('current',radar_private.admin_period(p_start,p_days,p_cohort),'previous',radar_private.admin_period(p_start-p_days,p_days,p_cohort),'sendingEnabled',coalesce((select enabled from public.job_radar_pilot_control where singleton),false),'generatedAt',now(),'timeZone','Asia/Jerusalem');
end $$;
create function radar_private.admin_stop() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not radar_private.is_admin() then raise insufficient_privilege using message='Administrator required';end if;
 update public.job_radar_pilot_control set enabled=false where singleton;
 insert into radar_private.admin_actions(actor,action) values(auth.uid(),'stop_sending');return true;
end $$;
revoke all on function radar_private.admin_summary(date,integer,text),radar_private.admin_stop() from public,anon,service_role;
grant execute on function radar_private.admin_summary(date,integer,text),radar_private.admin_stop() to authenticated;
create function public.radar_admin_summary(p_start date,p_days integer,p_cohort text) returns jsonb language sql stable security invoker set search_path='' as $$ select radar_private.admin_summary(p_start,p_days,p_cohort); $$;
create function public.radar_admin_stop() returns boolean language sql security invoker set search_path='' as $$select radar_private.admin_stop();$$;
revoke all on function public.radar_admin_summary(date,integer,text),public.radar_admin_stop() from public,anon,service_role;
grant execute on function public.radar_admin_summary(date,integer,text),public.radar_admin_stop() to authenticated;
commit;
