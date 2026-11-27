-- Existing consent is preserved. Searches never enroll accounts or resume alerts.
alter table public.job_radar_preferences add column search_updated_at timestamptz;
create function radar_private.update_search(p_preferences jsonb,p_expected_version timestamptz,p_searched_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); saved public.job_radar_preferences; clean jsonb:='{}'::jsonb; k text; stamp timestamptz;
begin
 if owner_id is null or not exists(select 1 from auth.users where id=owner_id and email_confirmed_at is not null and coalesce(is_anonymous,false)=false) then raise exception 'Verified account required'; end if;
 select * into saved from public.job_radar_preferences where user_id=owner_id for update;
 if not found or not saved.enabled or saved.revoked_at is not null or saved.consent_version<>'job-radar-v1' then return jsonb_build_object('updated',false,'reason','alerts_not_enabled'); end if;
 if p_expected_version is null or p_expected_version is distinct from saved.updated_at or p_searched_at is null or p_searched_at<=greatest(saved.updated_at,coalesce(saved.search_updated_at,saved.updated_at)) or p_searched_at>clock_timestamp()+interval '1 minute' then return jsonb_build_object('updated',false,'reason','stale_search'); end if;
 if p_preferences is null or jsonb_typeof(p_preferences)<>'object' then raise exception 'Invalid search'; end if;
 foreach k in array array['role','country','city','workModel','seniority','employmentType'] loop
  if jsonb_typeof(p_preferences->k) is distinct from 'string' or char_length(p_preferences->>k)>120 then raise exception 'Invalid search field'; end if;
  clean:=clean||jsonb_build_object(k,btrim(p_preferences->>k));
 end loop;
 if clean->>'role'='' or clean->>'country'='' then raise exception 'Role and country required'; end if;
 stamp:=clock_timestamp();
 update public.job_radar_preferences set preferences=clean,search_updated_at=p_searched_at,updated_at=stamp where user_id=owner_id;
 -- The existing preference-version trigger cancels pending dispatches. Do not
 -- fabricate an explicit-consent event, change frequency/language, or enable pilot.
 return jsonb_build_object('updated',true,'updated_at',stamp,'preferences',clean);
end $$;
revoke all on function radar_private.update_search(jsonb,timestamptz,timestamptz) from public,anon,service_role;
grant execute on function radar_private.update_search(jsonb,timestamptz,timestamptz) to authenticated;
create function public.update_job_radar_search(p_preferences jsonb,p_expected_version timestamptz,p_searched_at timestamptz)
returns jsonb language sql security invoker set search_path='' as $$select radar_private.update_search(p_preferences,p_expected_version,p_searched_at);$$;
revoke all on function public.update_job_radar_search(jsonb,timestamptz,timestamptz) from public,anon,service_role;
grant execute on function public.update_job_radar_search(jsonb,timestamptz,timestamptz) to authenticated;
