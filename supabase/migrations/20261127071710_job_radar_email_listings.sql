begin;
-- Public, non-personal listing snapshots only. No recipient, search or account data.
create table public.job_radar_listings (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  source_id text not null unique check (char_length(source_id) between 1 and 300),
  title text not null check (char_length(title) between 1 and 500),
  company text not null check (char_length(company) between 1 and 300),
  location text not null check (char_length(location) between 1 and 500),
  source_url text not null check (char_length(source_url) <= 2048 and source_url like 'https://%'),
  provider text not null check (provider in ('greenhouse','lever')),
  posted_at timestamptz,
  expires_at timestamptz not null,
  is_active boolean not null default true
);
alter table public.job_radar_listings enable row level security;
revoke all on public.job_radar_listings from anon, authenticated, service_role;
grant select on public.job_radar_listings to anon, authenticated;
grant select, insert, update on public.job_radar_listings to service_role;
create policy radar_listing_public_read on public.job_radar_listings for select to anon, authenticated
  using (is_active and expires_at > now());
commit;
