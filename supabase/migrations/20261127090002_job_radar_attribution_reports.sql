begin;
-- Reuse CARVIO's existing cloud-workspace contract when installing a fresh dev project.
do $$begin
 if to_regclass('public.user_workspaces') is null then
  create table public.user_workspaces(user_id uuid primary key references auth.users(id) on delete cascade,workspace_data jsonb not null default '{}'::jsonb,schema_version integer not null default 1 check(schema_version>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
  alter table public.user_workspaces enable row level security;
  revoke all on public.user_workspaces from anon,authenticated;
  grant select,insert,update,delete on public.user_workspaces to authenticated;
  create policy workspace_owner on public.user_workspaces for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
 end if;
end $$;
create table public.job_radar_attribution_links(
 token uuid primary key default gen_random_uuid(),
 dispatch_id uuid not null references public.job_radar_dispatches(id) on delete cascade,
 listing_id text not null references public.job_radar_listings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 unique(dispatch_id,listing_id)
);
create index if not exists radar_link_listing on public.job_radar_attribution_links(listing_id);
create index radar_link_owner on public.job_radar_attribution_links(user_id);
create table public.job_radar_action_events(
 dispatch_id uuid not null references public.job_radar_dispatches(id) on delete cascade,
 listing_id text not null references public.job_radar_listings(id) on delete cascade,
 event text not null check(event in ('clicked','returned','saved','applied')),
 occurred_at timestamptz not null default clock_timestamp(),
 primary key(dispatch_id,listing_id,event)
);
create index radar_action_listing on public.job_radar_action_events(listing_id);
create index radar_action_time on public.job_radar_action_events(occurred_at);
create table public.job_radar_daily_reports(
 day date primary key,generated_at timestamptz not null default clock_timestamp(),summary jsonb not null
);
alter table public.job_radar_attribution_links enable row level security;
alter table public.job_radar_action_events enable row level security;
alter table public.job_radar_daily_reports enable row level security;
revoke all on public.job_radar_attribution_links,public.job_radar_action_events,public.job_radar_daily_reports from public,anon,authenticated,service_role;
grant select,insert,update on public.job_radar_attribution_links,public.job_radar_daily_reports to service_role;
grant select,insert on public.job_radar_action_events to service_role;
create policy radar_link_service on public.job_radar_attribution_links for all to service_role using(true) with check(true);
create policy radar_action_service on public.job_radar_action_events for all to service_role using(true) with check(true);
create policy radar_report_service on public.job_radar_daily_reports for all to service_role using(true) with check(true);

create function public.create_radar_attribution_links(p_dispatch uuid)
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
revoke all on function public.create_radar_attribution_links(uuid) from public,anon,authenticated;
grant execute on function public.create_radar_attribution_links(uuid) to service_role;

create function radar_private.job_identity(url text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(url,'[?#].*$','')||coalesce('|gh_jid='||substring(url from '[?&]gh_jid=([0-9]+)'),'');
$$;
revoke all on function radar_private.job_identity(text) from public,anon,authenticated;
create function radar_private.record_action(p_token uuid,p_event text)
returns boolean language plpgsql security definer set search_path='' as $$
declare link public.job_radar_attribution_links; d public.job_radar_dispatches; data jsonb; source text; valid boolean;
begin
 if p_event not in ('clicked','returned','saved','applied') then return false;end if;
 select * into link from public.job_radar_attribution_links where token=p_token and user_id=auth.uid() and expires_at>clock_timestamp();
 if link.token is null then return false;end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then return false;end if;
 if not exists(select 1 from public.job_radar_preferences where user_id=auth.uid() and enabled and consent_version='job-radar-v1') then return false;end if;
 select * into d from public.job_radar_dispatches where id=link.dispatch_id and state='sent' and mode='live' and sent_at is not null;
 if d.id is null or clock_timestamp()>=d.sent_at+interval '7 days' then return false;end if;
 if p_event<>'clicked' and not exists(select 1 from public.job_radar_action_events where dispatch_id=d.id and listing_id=link.listing_id and event='clicked') then return false;end if;
 if p_event in ('saved','applied') then
  select workspace_data into data from public.user_workspaces where user_id=auth.uid();
  select source_url into source from public.job_radar_listings where id=link.listing_id;
  if jsonb_typeof(data->'applications') is distinct from 'array' or jsonb_typeof(data->'actionEvents') is distinct from 'array' then return false;end if;
  select exists(
   select 1 from jsonb_array_elements(data->'applications') a join jsonb_array_elements(data->'actionEvents') e on e->>'targetId'=a->>'id'
   where radar_private.job_identity(a->>'jobUrl')=radar_private.job_identity(source)
   and case when e->>'occurredAt' ~ '^\d{4}-\d{2}-\d{2}T' then (e->>'occurredAt')::timestamptz between d.sent_at and clock_timestamp() else false end
   and ((p_event='saved' and e->>'name' in ('opportunity_saved','application_created')) or (p_event='applied' and (e->>'name'='marked_applied' or (e->>'name'='application_created' and e->'properties'->>'status'='Applied'))))
  ) into valid;
  if not valid then return false;end if;
 end if;
 insert into public.job_radar_action_events(dispatch_id,listing_id,event) values(d.id,link.listing_id,p_event) on conflict do nothing;
 return true;
exception when invalid_datetime_format or datetime_field_overflow then return false;
end $$;
revoke all on function radar_private.record_action(uuid,text) from public,anon;
grant usage on schema radar_private to authenticated;
grant execute on function radar_private.record_action(uuid,text) to authenticated;
create function public.record_radar_action(p_token uuid,p_event text) returns boolean language sql security invoker set search_path='' as $$select radar_private.record_action(p_token,p_event)$$;
revoke all on function public.record_radar_action(uuid,text) from public,anon;
grant execute on function public.record_radar_action(uuid,text) to authenticated;
commit;
