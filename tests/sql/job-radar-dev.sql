-- Run only against isolated carvio-dev. Everything, including fixture accounts, rolls back.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  unverified uuid := gen_random_uuid();
  prefs jsonb := '{"role":"Recruitment Manager","country":"Israel","city":"Tel Aviv","seniority":"","workModel":"Hybrid","employmentType":"Full-time"}';
  denied boolean;
  total integer;
begin
  insert into auth.users(id,email,email_confirmed_at,is_anonymous)
  values(a,a::text || '@example.test',now(),false),(b,b::text || '@example.test',now(),false),(unverified,unverified::text || '@example.test',null,false);
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  perform public.save_job_radar_preferences(true,prefs,3,'he','job-radar-v1');
  if not exists(select 1 from public.job_radar_preferences where user_id=a and enabled and frequency_per_week=3) then raise exception 'save failed'; end if;
  perform public.save_job_radar_preferences(true,prefs,2,'en','job-radar-v1');
  denied := false;
  begin
    insert into public.job_radar_deliveries(user_id,job_id,job_url) values(a,'fake','https://example.test/jobs/fake');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'client forged delivery'; end if;
  execute 'reset role';
  execute 'set local role service_role';
  insert into public.job_radar_deliveries(user_id,job_id,job_url) values(a,'fixture:1','https://example.test/jobs/1');
  execute 'reset role';
  execute 'set local role authenticated';
  select count(*) into total from public.job_radar_deliveries;
  if total <> 1 then raise exception 'owner history missing'; end if;
  perform set_config('request.jwt.claim.sub',b::text,true);
  select count(*) into total from public.job_radar_preferences;
  if total <> 0 then raise exception 'cross-user preferences leak'; end if;
  select count(*) into total from public.job_radar_deliveries;
  if total <> 0 then raise exception 'cross-user deliveries leak'; end if;
  select count(*) into total from public.job_radar_consent_events;
  if total <> 0 then raise exception 'cross-user consent leak'; end if;
  perform set_config('request.jwt.claim.sub',unverified::text,true);
  denied := false;
  begin
    perform public.save_job_radar_preferences(true,prefs,3,'he','job-radar-v1');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'unverified consent allowed'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.save_job_radar_preferences(false,'{}',3,'he','job-radar-v1');
  if not exists(select 1 from public.job_radar_preferences where user_id=a and not enabled and revoked_at is not null and frequency_per_week=2) then raise exception 'revocation failed'; end if;
  select count(*) into total from public.job_radar_consent_events;
  if total <> 3 then raise exception 'audit history mismatch'; end if;
  denied := false;
  begin
    delete from public.job_radar_consent_events where user_id=a;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'audit history editable'; end if;
  execute 'reset role';
  execute 'set local role anon';
  denied := false;
  begin
    perform count(*) from public.job_radar_preferences;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'anonymous read allowed'; end if;
  execute 'reset role';
end $$;
select 'PASS: save, edits, revoke, verified account enforcement, delivery history and owner isolation' as result;
rollback;
