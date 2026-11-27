begin;
-- Conversion evidence is the authenticated user's persisted workspace, even on another device.
create function radar_private.workspace_attribution() returns trigger language plpgsql security definer set search_path='' as $$
declare item record;
begin
 if new.user_id is distinct from auth.uid() then return new;end if;
 for item in select token from public.job_radar_attribution_links where user_id=new.user_id and expires_at>clock_timestamp() loop
  perform radar_private.record_action(item.token,'saved');
  perform radar_private.record_action(item.token,'applied');
 end loop;
 return new;
exception when others then
 -- Telemetry must never make an otherwise valid cloud save fail. No payloads in logs.
 raise log 'radar workspace attribution skipped: %',SQLSTATE;
 return new;
end $$;
revoke all on function radar_private.workspace_attribution() from public,anon,authenticated,service_role;
create trigger radar_workspace_attribution after insert or update of workspace_data on public.user_workspaces for each row execute function radar_private.workspace_attribution();
commit;
