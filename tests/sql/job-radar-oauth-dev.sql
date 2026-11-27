begin;
do $$
begin
 if exists (select 1 from pg_tables where schemaname='public' and tablename in ('job_radar_oauth_states','job_radar_oauth_connections') and not rowsecurity) then raise exception 'oauth_rls_missing'; end if;
 if has_table_privilege('anon','public.job_radar_oauth_connections','SELECT') or has_table_privilege('authenticated','public.job_radar_oauth_connections','SELECT') then raise exception 'oauth_credentials_public'; end if;
 if has_table_privilege('anon','public.job_radar_oauth_states','INSERT') or has_table_privilege('authenticated','public.job_radar_oauth_states','DELETE') then raise exception 'oauth_state_public'; end if;
 if (select enabled from public.job_radar_pilot_control where singleton) then raise exception 'pilot_must_remain_off'; end if;
end $$;
set local role service_role;
insert into public.job_radar_oauth_states(state_hash,binding_hash,encrypted_verifier,expires_at)
 values (repeat('a',64),repeat('b',64),'v1.fixture.fake.ciphertext',now()+interval '10 minutes'),
 (repeat('c',64),repeat('d',64),'v1.fixture.fake.ciphertext',now()-interval '1 second');
do $$
declare n integer;
begin
 delete from public.job_radar_oauth_states where state_hash=repeat('a',64) and binding_hash=repeat('f',64) and expires_at>now();
 get diagnostics n=row_count; if n<>0 then raise exception 'wrong_binding_consumed'; end if;
 delete from public.job_radar_oauth_states where state_hash=repeat('c',64) and binding_hash=repeat('d',64) and expires_at>now();
 get diagnostics n=row_count; if n<>0 then raise exception 'expired_state_consumed'; end if;
 delete from public.job_radar_oauth_states where state_hash=repeat('a',64) and binding_hash=repeat('b',64) and expires_at>now();
 get diagnostics n=row_count; if n<>1 then raise exception 'valid_state_not_consumed'; end if;
 delete from public.job_radar_oauth_states where state_hash=repeat('a',64) and binding_hash=repeat('b',64) and expires_at>now();
 get diagnostics n=row_count; if n<>0 then raise exception 'state_replayed'; end if;
 begin
  insert into public.job_radar_oauth_connections values ('personal@example.test','fixture','v1.fixture.fake.ciphertext',array['fixture'],now(),null);
  raise exception 'wrong_sender_accepted';
 exception when check_violation then null;
 end;
 insert into public.job_radar_oauth_connections values ('carvio.team@gmail.com','fixture','v1.fixture.fake.ciphertext',array['https://www.googleapis.com/auth/gmail.send'],now(),null);
end $$;
reset role;
select 'oauth_database_checks_passed' as result;
rollback;
