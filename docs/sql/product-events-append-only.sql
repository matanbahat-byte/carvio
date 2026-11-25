-- PROPOSAL ONLY: review and validate on an isolated database before approval.
-- No rows are rewritten/deleted. Auth/account deletion cascades and privileged
-- service-role administration are intentionally unaffected.
begin;

-- Fail closed on schema/policy drift instead of silently leaving a permissive
-- policy in place. PostgreSQL ORs permissive policies for the same operation.
do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_events' and c.relrowsecurity
  ) then
    raise exception 'product_events must already exist with RLS enabled';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_events'
      and policyname not in (
        'Users can manage their own product events',
        'Users can read their own product events',
        'Users can append their own product events'
      )
  ) then
    raise exception 'Unexpected product_events policies; review drift before applying';
  end if;
end;
$$;

drop policy if exists "Users can manage their own product events" on public.product_events;
drop policy if exists "Users can read their own product events" on public.product_events;
drop policy if exists "Users can append their own product events" on public.product_events;

create policy "Users can read their own product events"
  on public.product_events for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can append their own product events"
  on public.product_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- No UPDATE/DELETE policy: ordinary authenticated users cannot alter history.
-- ON CONFLICT (id) DO NOTHING remains compatible: it needs INSERT, not UPDATE.
-- Rollback restores the former own-row ALL policy only; see the paired file.
commit;
