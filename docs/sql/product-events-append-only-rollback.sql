-- MANUAL ROLLBACK PROPOSAL ONLY. Restores former permissions without row changes.
-- Review current pg_policies first; do not run over unrelated policy changes.
begin;
drop policy if exists "Users can read their own product events" on public.product_events;
drop policy if exists "Users can append their own product events" on public.product_events;
drop policy if exists "Users can manage their own product events" on public.product_events;
create policy "Users can manage their own product events"
  on public.product_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
commit;
