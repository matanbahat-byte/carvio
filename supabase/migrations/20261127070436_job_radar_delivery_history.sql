-- Development foundation: actual successful deliveries only; no sender is installed.
begin;
create table public.job_radar_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null check (char_length(job_id) between 1 and 300),
  job_url text not null check (char_length(job_url) between 1 and 2048 and job_url like 'https://%'),
  delivered_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
alter table public.job_radar_deliveries enable row level security;
revoke all on public.job_radar_deliveries from anon, authenticated, service_role;
grant select on public.job_radar_deliveries to authenticated;
grant select, insert on public.job_radar_deliveries to service_role;
create policy radar_delivery_owner_read on public.job_radar_deliveries
  for select to authenticated using (user_id = (select auth.uid()));
comment on table public.job_radar_deliveries is 'Confirmed successful deliveries only. Clients cannot fabricate, edit or erase delivery history. No sending path is enabled.';
commit;
