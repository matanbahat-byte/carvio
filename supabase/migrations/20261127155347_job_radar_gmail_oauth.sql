-- Isolated sender provisioning only; no auth configuration or pilot switch changes.
create table public.job_radar_oauth_states (
 state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
 binding_hash text not null check (binding_hash ~ '^[0-9a-f]{64}$'),
 encrypted_verifier text not null check (encrypted_verifier like 'v1.%'),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index job_radar_oauth_states_expiry on public.job_radar_oauth_states(expires_at);
create table public.job_radar_oauth_connections (
 sender text primary key check (sender = 'carvio.team@gmail.com'),
 client_id text not null,
 encrypted_refresh_token text not null check (encrypted_refresh_token like 'v1.%'),
 scopes text[] not null,
 verified_at timestamptz not null,
 refresh_expires_at timestamptz
);
alter table public.job_radar_oauth_states enable row level security;
alter table public.job_radar_oauth_connections enable row level security;
revoke all on public.job_radar_oauth_states, public.job_radar_oauth_connections from public, anon, authenticated;
grant select, insert, delete on public.job_radar_oauth_states to service_role;
grant select, insert, update, delete on public.job_radar_oauth_connections to service_role;
comment on table public.job_radar_oauth_connections is 'Server-only AES-GCM ciphertext. Key is held outside Postgres. Provisioning never enables sending.';
