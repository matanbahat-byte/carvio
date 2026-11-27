-- Actual isolated development database. All identities, fake acknowledgments and events roll back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();d uuid;t uuid;v timestamptz;n integer;denied boolean; lid text:=repeat('e',64); now_at timestamptz;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(a,a::text||'@example.test',now(),false),(b,b::text||'@example.test',now(),false);
 insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at) values(a,true,'{"role":"Recruitment Manager","country":"Israel","city":"Tel Aviv","seniority":"","workModel":"","employmentType":""}',3,'he','job-radar-v1',now()) returning updated_at into v;
 insert into public.job_radar_listings(id,source_id,title,company,location,source_url,provider,expires_at) values(lid,'greenhouse:attribution-fixture:1','Fixture role','Fixture company','Tel Aviv, Israel','https://boards.greenhouse.io/attribution-fixture/jobs/1','greenhouse',now()+interval '7 days');

 -- Two fictional, explicitly consented accounts; this transaction always rolls back.
 for n in 1..1 loop
  declare extra uuid:=gen_random_uuid();begin
   insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(extra,extra::text||'@example.test',now(),false);
   insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at) values(extra,true,'{"role":"HR","country":"Israel"}',2,'en','job-radar-v1',now());
   insert into public.job_radar_pilot_members(user_id) values(extra);
  end;
 end loop;
 insert into public.job_radar_pilot_members(user_id) values(a);
 update public.job_radar_pilot_control set approved_cohort_size=2,enabled=true where singleton;
 execute 'set local role service_role';
 d:=public.claim_radar_dispatch(a,current_date,'live',v);
 if not public.reserve_radar_jobs(d,'[{"id":"greenhouse:attribution-fixture:1","url":"https://boards.greenhouse.io/attribution-fixture/jobs/1","canonical":"https://boards.greenhouse.io/attribution-fixture/jobs/1"}]') then raise exception 'reserve failed';end if;
 select token into t from public.create_radar_attribution_links(d);
 if t is null then raise exception 'opaque link missing';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 if jsonb_array_length(public.get_job_radar_workspace()->'jobs')<>0 then raise exception 'unsent history exposed';end if;
 if public.record_radar_action(t,'clicked') then raise exception 'unsent message attributed';end if;
 execute 'reset role';execute 'set local role service_role';
 if not public.gate_radar_dispatch(d,v) then raise exception 'gate failed';end if;
 perform public.finish_radar_dispatch(d,'sent','gmail_accepted','simulated-only-no-network');
 execute 'reset role';perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 if jsonb_array_length(public.get_job_radar_workspace()->'jobs')<>1 then raise exception 'sent owner history missing';end if;
 if public.get_job_radar_workspace()::text like '%token%' then raise exception 'history exposed token';end if;
 if not public.record_radar_action(t,'clicked') or not public.record_radar_action(t,'clicked') or not public.record_radar_action(t,'returned') then raise exception 'owner action failed';end if;
 if public.record_radar_action(t,'saved') then raise exception 'save invented without workspace';end if;
 insert into public.user_workspaces(user_id,workspace_data) values(a,jsonb_build_object('applications',jsonb_build_array(jsonb_build_object('id','app-fixture','jobUrl','https://boards.greenhouse.io/attribution-fixture/jobs/1','status','Applied')),'actionEvents',jsonb_build_array(jsonb_build_object('targetId','app-fixture','name','opportunity_saved','occurredAt',clock_timestamp()),jsonb_build_object('targetId','app-fixture','name','marked_applied','occurredAt',clock_timestamp()))));
 execute 'reset role';
 select count(*) into n from public.job_radar_action_events where dispatch_id=d and event in ('saved','applied');
 if n<>2 then raise exception 'server-side cloud attribution did not run';end if;
 execute 'set local role authenticated';
 if not public.record_radar_action(t,'saved') or not public.record_radar_action(t,'applied') then raise exception 'synced workspace evidence rejected';end if;
 perform public.record_radar_action(t,'applied');
 perform set_config('request.jwt.claim.sub',b::text,true);
 if jsonb_array_length(public.get_job_radar_workspace()->'jobs')<>0 then raise exception 'other owner history exposed';end if;
 if public.record_radar_action(t,'clicked') then raise exception 'forwarded token attributed to other user';end if;
 denied:=false;begin perform count(*) from public.job_radar_attribution_links;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'private token mapping exposed';end if;
 execute 'reset role';
 select count(*) into n from public.job_radar_action_events where dispatch_id=d;
 if n<>4 then raise exception 'dedup or funnel events incorrect: %',n;end if;
 update public.job_radar_preferences set enabled=false,revoked_at=now(),updated_at=clock_timestamp() where user_id=a;
 perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 if public.record_radar_action(t,'clicked') then raise exception 'revoked owner still attributed';end if;
 execute 'reset role';execute 'set local role anon';
 denied:=false;begin perform public.get_job_radar_workspace();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous history access';end if;
 denied:=false;begin perform public.record_radar_action(t,'clicked');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'anonymous/scanner could attribute';end if;
 execute 'reset role';
end $$;
select 'PASS: opaque dispatch links, accepted-only analytics, owner isolation, forwarded/scanner denial, real workspace evidence, dedup and revocation; no emails' as result;
rollback;
