-- Isolated dev only, fictional data, complete rollback, no mail/network provider.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();d uuid:=gen_random_uuid();u uuid;msg uuid;previous_msg uuid;pending uuid;version timestamptz;r jsonb;denied boolean;n integer;lid text:=repeat('f',64);
begin
 foreach u in array array[a,b,c,d] loop
  insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(u,u::text||'@example.test',now(),false);
  insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at) values(u,true,'{"role":"HR","country":"Israel"}',3,'he','job-radar-v1',now());
 end loop;
 insert into radar_private.admin_members(user_id) values(a);
 insert into radar_private.account_labels(user_id,kind) values(b,'test'),(c,'real');
 insert into public.job_radar_pilot_members(user_id) values(a),(b);
 update public.job_radar_pilot_control set enabled=true,approved_cohort_size=2;
 foreach u in array array[a,b,c,d] loop
  insert into public.job_radar_dispatches(user_id,slot_date,mode,preference_version,state,created_at,sent_at,finished_at,selected_job_count)
  values(u,'2026-11-26','live',now(),'sent','2026-11-26T07:00:00Z','2026-11-26T07:00:00Z','2026-11-26T07:00:00Z',2) returning id into msg;
  if u=a then previous_msg:=msg;end if;
 end loop;
 insert into public.job_radar_listings(id,source_id,title,company,location,source_url,provider,expires_at) values(lid,'greenhouse:fixture:1','Fixture','Fixture','Israel','https://boards.greenhouse.io/fixture/jobs/1','greenhouse',now()+interval '1 day');
 insert into public.job_radar_action_events(dispatch_id,listing_id,event,occurred_at) values(previous_msg,lid,'clicked','2026-11-26T08:00:00Z'),(previous_msg,lid,'returned','2026-11-26T08:00:00Z'),(previous_msg,lid,'saved','2026-11-27T08:00:00Z');
 insert into public.job_radar_consent_events(user_id,enabled,preferences,frequency_per_week,language,consent_version,recorded_at) values(a,true,'{}',3,'he','job-radar-v1','2026-11-26T06:00:00Z'),(a,false,'{}',3,'he','job-radar-v1','2026-11-26T09:00:00Z'),(a,false,'{}',3,'he','job-radar-v1','2026-11-26T10:00:00Z');
 insert into public.job_radar_dispatches(user_id,slot_date,mode,preference_version,state,created_at,sent_at,finished_at,selected_job_count) values(a,'2026-11-25','live',now(),'sent','2026-11-25T07:00:00Z','2026-11-25T07:00:00Z','2026-11-25T07:00:00Z',1);
 -- Regular authenticated member is not an admin, including direct RPC calls.
 perform set_config('request.jwt.claim.sub',b::text,true);execute 'set local role authenticated';
 if public.radar_admin_access() then raise exception 'regular user granted admin';end if;
 denied:=false;begin perform public.radar_admin_summary('2026-11-26',1,'pilot');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'report leaked to regular user';end if;
 denied:=false;begin perform public.radar_admin_stop();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'regular user stopped system';end if;
 denied:=false;begin insert into radar_private.admin_members values(b,true);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'self promotion allowed';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 if not public.radar_admin_access() then raise exception 'verified admin refused';end if;
 r:=public.radar_admin_summary('2026-11-26',1,'pilot');
 if (r#>>'{current,sent}')::integer<>1 or (r#>>'{previous,sent}')::integer<>1 or (r#>>'{current,selectedJobs}')::integer<>2 or (r#>>'{current,clicked}')::integer<>1 or (r#>>'{current,returned}')::integer<>1 or (r#>>'{current,saved}')::integer<>1 or (r#>>'{current,unsubscribed}')::integer<>1 then raise exception 'aggregate/dedup/cohort comparison incorrect: %',r;end if;
 if r::text like '%example.test%' or r::text like '%'||a::text||'%' then raise exception 'personal data leaked';end if;
 r:=public.radar_admin_summary('2026-11-20',7,'pilot');
 if (r#>>'{current,sent}')::integer<>2 or (r#>>'{previous,sent}')::integer<>0 then raise exception 'weekly comparison incorrect';end if;
 execute 'reset role';update public.job_radar_dispatches set selected_job_count=null where id=previous_msg;execute 'set local role authenticated';
 r:=public.radar_admin_summary('2026-11-26',1,'pilot');
 if r#>'{current,selectedJobs}'<>'null'::jsonb then raise exception 'missing count fabricated as zero';end if;
 execute 'reset role';update public.job_radar_dispatches set selected_job_count=2 where id=previous_msg;execute 'set local role authenticated';
 foreach u in array array[b,c,d] loop
  r:=public.radar_admin_summary('2026-11-26',1,case u when b then 'test' when c then 'real' else 'unclassified' end);
  if (r#>>'{current,sent}')::integer<>1 then raise exception 'classification blended';end if;
 end loop;
 execute 'reset role';
 select updated_at into version from public.job_radar_preferences where user_id=a;
 execute 'set local role service_role';
 pending:=public.claim_radar_dispatch(a,'2026-11-29','live',version);
 if not public.reserve_radar_jobs(pending,'[{"id":"fixture:pending","url":"https://example.test/pending","canonical":"https://example.test/pending"}]') then raise exception 'pending fixture failed';end if;
 if (select selected_job_count from public.job_radar_dispatches where id=pending)<>1 then raise exception 'selected count not captured';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 if not public.radar_admin_stop() then raise exception 'admin stop failed';end if;
 execute 'reset role';
 if exists(select 1 from public.job_radar_pilot_control where enabled) or not exists(select 1 from public.job_radar_dispatches where id=pending and state='cancelled' and selected_job_count=1) or exists(select 1 from public.job_radar_reservations where dispatch_id=pending) then raise exception 'stop cancellation/count retention failed';end if;
 if not exists(select 1 from radar_private.admin_actions where actor=a and action='stop_sending') then raise exception 'admin stop not audited';end if;
 update radar_private.admin_members set active=false where user_id=a;
 execute 'set local role authenticated';
 if public.radar_admin_access() then raise exception 'revoked admin retained access';end if;
 denied:=false;begin perform public.radar_admin_stop();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'revoked admin action allowed';end if;
 execute 'reset role';execute 'set local role anon';
 denied:=false;begin perform public.radar_admin_summary('2026-11-26',7,'test');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous access allowed';end if;
 execute 'reset role';
end $$;
select 'PASS: admin only, no self-promotion, revoked/anonymous denied, separate cohorts, period comparison, deduplicated conversions, aggregate privacy, audited stop cancels pending, selected count retained; no email' as result;
rollback;
