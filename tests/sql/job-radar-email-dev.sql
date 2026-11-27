-- Run only in isolated carvio-dev; fixtures always roll back.
begin;
do $$
declare denied boolean; total integer;
begin
 insert into public.job_radar_listings(id,source_id,title,company,location,source_url,provider,expires_at,is_active) values
 (repeat('a',64),'fixture:active','Fixture role','Fixture company','Fixture city','https://example.test/jobs/active','greenhouse',now()+interval '1 day',true),
 (repeat('b',64),'fixture:expired','Expired role','Fixture company','Fixture city','https://example.test/jobs/expired','greenhouse',now()-interval '1 day',true),
 (repeat('c',64),'fixture:inactive','Inactive role','Fixture company','Fixture city','https://example.test/jobs/inactive','greenhouse',now()+interval '1 day',false);
 execute 'set local role anon';
 select count(*) into total from public.job_radar_listings where id in(repeat('a',64),repeat('b',64),repeat('c',64));
 if total<>1 then raise exception 'public active-only RLS failed'; end if;
 denied:=false;
 begin update public.job_radar_listings set title='forged'; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'anonymous catalog mutation allowed'; end if;
 execute 'reset role';execute 'set local role authenticated';
 denied:=false;
 begin insert into public.job_radar_listings(id,source_id,title,company,location,source_url,provider,expires_at) values(repeat('d',64),'fixture:forged','Forged','Fixture','Fixture','https://example.test/jobs/forged','lever',now()); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'client catalog insert allowed'; end if;
 execute 'reset role';
end $$;
select 'PASS: only active/unexpired public jobs are visible; anonymous/authenticated catalog writes denied' as result;
rollback;
