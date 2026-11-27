-- Owner-only workspace summary; never exposes tokens, other accounts or dry-run messages.
begin;
create function radar_private.workspace_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); jobs jsonb; running boolean;
begin
 if owner_id is null or not radar_private.pilot_verified(owner_id) then raise exception 'Verified account required';end if;
 select coalesce(c.enabled and m.active,false) into running from public.job_radar_pilot_control c left join public.job_radar_pilot_members m on m.user_id=owner_id where c.singleton;
 select coalesce(jsonb_agg(to_jsonb(j) order by j.sent_at desc,j.id),'[]'::jsonb) into jobs from (select * from (
  select distinct on(l.id) l.id,l.title,l.company,l.location,l.source_url,l.provider,l.is_active,l.expires_at,d.sent_at
  from public.job_radar_dispatches d join public.job_radar_attribution_links a on a.dispatch_id=d.id and a.user_id=owner_id
  join public.job_radar_listings l on l.id=a.listing_id
  where d.user_id=owner_id and d.mode='live' and d.state='sent' and d.sent_at is not null
  order by l.id,d.sent_at desc
 ) latest order by sent_at desc,id limit 20) j;
 return jsonb_build_object('runtimeEnabled',coalesce(running,false),'jobs',jobs);
end $$;
revoke all on function radar_private.workspace_summary() from public,anon,service_role;
grant usage on schema radar_private to authenticated;
grant execute on function radar_private.workspace_summary() to authenticated;
create function public.get_job_radar_workspace() returns jsonb language sql stable security invoker set search_path='' as $$select radar_private.workspace_summary();$$;
revoke all on function public.get_job_radar_workspace() from public,anon,service_role;
grant execute on function public.get_job_radar_workspace() to authenticated;
commit;
