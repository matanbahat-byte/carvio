-- No network/send provider. Fictional identities and controls roll back completely.
begin;
do $$
declare users uuid[]:='{}';u uuid;v timestamptz;d uuid;d2 uuid;outsider uuid; outsider_d uuid;i integer;denied boolean;
begin
 for i in 1..6 loop
  u:=gen_random_uuid();users:=array_append(users,u);
  insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(u,u::text||'@example.test',now(),false);
  insert into public.job_radar_preferences(user_id,enabled,preferences,frequency_per_week,language,consent_version,consented_at) values(u,true,'{"role":"HR","country":"Israel"}',2,'en','job-radar-v1',now());
  if i<=5 then insert into public.job_radar_pilot_members(user_id) values(u);end if;
 end loop;
 if (select enabled from public.job_radar_pilot_control) then raise exception 'must start OFF';end if;
 select updated_at into v from public.job_radar_preferences where user_id=users[1];
 execute 'set local role service_role';
 d:=public.claim_radar_dispatch(users[1],current_date,'live',v);
 perform public.reserve_radar_jobs(d,'[{"id":"fixture:1","url":"https://example.test/1","canonical":"https://example.test/1"}]');
 if public.gate_radar_dispatch(d,v) then raise exception 'OFF gate allowed send';end if;
 execute 'reset role';
 update public.job_radar_pilot_control set enabled=true,approved_cohort_size=5,daily_limit=1;
 execute 'set local role service_role';
 if not public.gate_radar_dispatch(d,v) then raise exception 'member gate failed';end if;
 perform public.finish_radar_dispatch(d,'unknown','fixture_uncertain_no_network');
 select updated_at into v from public.job_radar_preferences where user_id=users[2];
 d2:=public.claim_radar_dispatch(users[2],current_date,'live',v);
 perform public.reserve_radar_jobs(d2,'[{"id":"fixture:2","url":"https://example.test/2","canonical":"https://example.test/2"}]');
 if public.gate_radar_dispatch(d2,v) then raise exception 'uncertain send did not consume daily cap';end if;
 select updated_at into v from public.job_radar_preferences where user_id=users[6];
 outsider_d:=public.claim_radar_dispatch(users[6],current_date+1,'live',v);
 perform public.reserve_radar_jobs(outsider_d,'[{"id":"fixture:3","url":"https://example.test/3","canonical":"https://example.test/3"}]');
 if public.gate_radar_dispatch(outsider_d,v) then raise exception 'nonmember allowed';end if;
 execute 'reset role';
 denied:=false;begin update public.job_radar_pilot_members set active=false where user_id=users[1];exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'cohort edited while enabled';end if;
 update public.job_radar_pilot_control set enabled=false;
 if exists(select 1 from public.job_radar_dispatches where id in(d2,outsider_d) and state<>'cancelled') then raise exception 'stop did not cancel pending';end if;
 if exists(select 1 from public.job_radar_reservations where dispatch_id in(d2,outsider_d)) then raise exception 'stop did not release pending jobs';end if;
 if not exists(select 1 from public.job_radar_reservations where dispatch_id=d) then raise exception 'stop erased uncertain evidence';end if;
 execute 'set local role authenticated';
 denied:=false;begin update public.job_radar_pilot_control set enabled=true;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'public control access';end if;
 execute 'reset role';
end $$;
select 'PASS: default OFF, verified five-member cohort, nonmember denied, daily cap includes unknown, global stop cancels pending, uncertainty retained, private controls; zero Gmail calls' as result;
rollback;
