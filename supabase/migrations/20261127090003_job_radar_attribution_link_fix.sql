begin;
create or replace function public.create_radar_attribution_links(p_dispatch uuid)
returns table(listing_id text,token uuid) language plpgsql security invoker set search_path='' as $$
declare d public.job_radar_dispatches;
begin
 select * into d from public.job_radar_dispatches where id=p_dispatch for update;
 if d.id is null or d.mode<>'live' or d.state<>'prepared' then raise exception 'Prepared live dispatch required';end if;
 insert into public.job_radar_attribution_links(dispatch_id,listing_id,user_id,expires_at)
 select d.id,l.id,d.user_id,least(l.expires_at,clock_timestamp()+interval '7 days')
 from public.job_radar_reservations r join public.job_radar_listings l on l.source_id=r.job_id
 where r.dispatch_id=d.id and l.is_active and l.expires_at>clock_timestamp()
 on conflict on constraint job_radar_attribution_links_dispatch_id_listing_id_key do nothing;
 return query select x.listing_id,x.token from public.job_radar_attribution_links x where x.dispatch_id=d.id;
end $$;
commit;
