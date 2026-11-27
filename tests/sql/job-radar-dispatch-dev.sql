-- Isolated carvio-dev only. Entire simulation, fixture account and logs roll back.
begin;
do $$
declare
 u uuid:=gen_random_uuid(); version timestamptz; d uuid; d2 uuid; d3 uuid; n integer; denied boolean;
 jobs jsonb:='[{"id":"fixture:1","url":"https://example.test/jobs/1","canonical":"https://example.test/jobs/1"}]';
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(u,u::text||'@example.test',now(),false);
 insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at) values(u,true,'{"role":"Recruitment Manager","country":"Israel","city":"Tel Aviv","seniority":"","workModel":"","employmentType":""}',3,'he','job-radar-v1',now()) returning updated_at into version;

 -- Five fictional, explicitly consented accounts; this transaction always rolls back.
 for n in 1..4 loop
  declare extra uuid:=gen_random_uuid();begin
   insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(extra,extra::text||'@example.test',now(),false);
   insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at) values(extra,true,'{"role":"HR","country":"Israel"}',2,'en','job-radar-v1',now());
   insert into public.job_radar_pilot_members(user_id) values(extra);
  end;
 end loop;
 insert into public.job_radar_pilot_members(user_id) values(u);
 update public.job_radar_pilot_control set approved_cohort_size=5,enabled=true where singleton;
 execute 'set local role service_role';
 d:=public.claim_radar_dispatch(u,'2026-11-29','dry-run',version);
 if d is null then raise exception 'claim failed';end if;
 if public.claim_radar_dispatch(u,'2026-11-29','dry-run',version) is not null then raise exception 'duplicate scheduled slot';end if;
 if not public.reserve_radar_jobs(d,jobs) then raise exception 'reservation failed';end if;
 if not public.gate_radar_dispatch(d,version) then raise exception 'consent gate failed';end if;
 perform public.finish_radar_dispatch(d,'dry_run_ready','simulated_success');
 if exists(select 1 from public.job_radar_deliveries where user_id=u) then raise exception 'dry-run fabricated a delivery';end if;
 if not exists(select 1 from public.job_radar_dispatches where id=d and state='dry_run_ready' and sent_at is null and finished_at is not null) then raise exception 'dry-run analytics missing';end if;
 d2:=public.claim_radar_dispatch(u,'2026-12-01','dry-run',version);
 if public.reserve_radar_jobs(d2,jobs) then raise exception 'same job reserved twice';end if;
 -- Live-mode database state is independent; no transport is called in this SQL test.
 d3:=public.claim_radar_dispatch(u,'2026-11-29','live',version);
 if not public.reserve_radar_jobs(d3,jobs) then raise exception 'simulation leaked into live history';end if;
 execute 'reset role';
 update public.job_radar_pilot_control set enabled=false where singleton;
 if not exists(select 1 from public.job_radar_dispatches where id=d3 and state='cancelled' and reason='pilot_stopped') then raise exception 'global stop failed';end if;
 if exists(select 1 from public.job_radar_reservations where dispatch_id=d3) then raise exception 'stop retained pending reservation';end if;
 update public.job_radar_pilot_control set enabled=true where singleton;
 -- Revocation must synchronously cancel prepared attempts and release unsent reservations.
 update public.job_radar_preferences set enabled=false,revoked_at=now(),updated_at=clock_timestamp() where user_id=u;
 if not exists(select 1 from public.job_radar_dispatches where id=d3 and state='cancelled') then raise exception 'pending send not cancelled';end if;
 if exists(select 1 from public.job_radar_reservations where dispatch_id=d3) then raise exception 'cancelled reservation not released';end if;
 execute 'set local role service_role';
 if public.gate_radar_dispatch(d3,version) then raise exception 'revocation gate allowed send';end if;
 execute 'reset role';
 -- Reenable, model an in-flight attempt and preserve uncertainty without claiming delivery.
 update public.job_radar_preferences set enabled=true,revoked_at=null,updated_at=clock_timestamp() where user_id=u returning updated_at into version;
 execute 'set local role service_role';
 d3:=public.claim_radar_dispatch(u,'2026-12-01','live',version);
 if not public.reserve_radar_jobs(d3,jobs) or not public.gate_radar_dispatch(d3,version) then raise exception 'in-flight simulation failed';end if;
 if public.gate_radar_dispatch(d3,version) then raise exception 'same send authorised twice';end if;
 perform public.finish_radar_dispatch(d3,'unknown','delivery_requires_reconciliation');
 if exists(select 1 from public.job_radar_deliveries where user_id=u) then raise exception 'uncertain result fabricated delivery';end if;
 d2:=public.claim_radar_dispatch(u,'2026-12-03','live',version);
 if public.reserve_radar_jobs(d2,jobs) then raise exception 'uncertain message could resend';end if;
 -- Simulate a provider acknowledgment entirely inside this rolled-back SQL transaction.
 d2:=public.claim_radar_dispatch(u,'2026-12-06','live',version);
 jobs:='[{"id":"fixture:2","url":"https://example.test/jobs/2","canonical":"https://example.test/jobs/2"}]';
 if not public.reserve_radar_jobs(d2,jobs) or not public.gate_radar_dispatch(d2,version) then raise exception 'ack simulation failed';end if;
 perform public.finish_radar_dispatch(d2,'sent','gmail_accepted','fixture-ack-only-no-email');
 if not exists(select 1 from public.job_radar_deliveries where user_id=u and job_id='fixture:2' and delivered_at is not null) then raise exception 'confirmed delivery history missing';end if;
 if not exists(select 1 from public.job_radar_dispatches where id=d2 and state='sent' and send_started_at is not null and sent_at is not null and provider_id='fixture-ack-only-no-email') then raise exception 'success analytics missing';end if;
 execute 'reset role';
 execute 'set local role anon';
 denied:=false;begin perform count(*) from public.job_radar_dispatches;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous analytics access';end if;
 denied:=false;begin perform public.claim_radar_dispatch(u,'2026-12-03','live',version);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous worker execution';end if;
 execute 'reset role';execute 'set local role authenticated';
 denied:=false;begin perform public.gate_radar_dispatch(d,version);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'authenticated worker execution';end if;
 execute 'reset role';
 select count(*) into n from public.job_radar_dispatch_events where dispatch_id in(select id from public.job_radar_dispatches where user_id=u);
 if n<8 then raise exception 'audit events missing';end if;
end $$;
select 'PASS: durable slot/job dedup, isolated dry-run, revoke trigger, final consent gate, uncertain delivery reservation, protected timestamped analytics; zero Gmail calls' as result;
rollback;
