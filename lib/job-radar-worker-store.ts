import type {SupabaseClient} from '@supabase/supabase-js';
import type {RadarDispatchStore,DispatchMode} from './job-radar-dispatch.ts';
export function canonicalRadarJobUrl(value:string) {
 const url=new URL(value);const id=url.searchParams.get('gh_jid');url.search='';url.hash='';if(id)url.searchParams.set('gh_jid',id);return url.href.replace(/\/$/,'');
}
export function createRadarDispatchStore(client:SupabaseClient):RadarDispatchStore {
 async function rpc(name:string,args:Record<string,unknown>){const result=await client.rpc(name,args).abortSignal(AbortSignal.timeout(10000));if(result.error)throw new Error('dispatch_database_unavailable');return result.data;}
 return {
  async read(userId:string,mode:DispatchMode){
   const saved=await client.from('job_radar_preferences').select('enabled,preferences,frequency_per_week,language,consent_version,updated_at').eq('user_id',userId).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
   if(saved.error)throw new Error('preferences_unavailable');
   if(!saved.data)return {subscription:null,sent:null};
   const account=await client.auth.admin.getUserById(userId);
   if(account.error||!account.data.user)throw new Error('account_unavailable');
   const h=await client.from('job_radar_deliveries').select('job_id,job_url',{count:'exact'}).eq('user_id',userId).order('job_id').range(0,999).abortSignal(AbortSignal.timeout(5000));
   const r=await client.from('job_radar_reservations').select('job_id,job_url',{count:'exact'}).eq('user_id',userId).eq('mode',mode).order('job_id').range(0,999).abortSignal(AbortSignal.timeout(5000));
   const complete=!h.error&&!r.error&&Array.isArray(h.data)&&Array.isArray(r.data)&&h.count===h.data.length&&r.count===r.data.length;
   const data=saved.data;const user=account.data.user;
   return {subscription:{userId,enabled:data.enabled,consentVersion:data.consent_version,updatedAt:data.updated_at,preferences:data.preferences,frequency:data.frequency_per_week,language:data.language,email:user.email||'',verified:!!user.email&&!!user.email_confirmed_at&&!user.is_anonymous},sent:complete?[...h.data!,...r.data!].map(j=>({id:j.job_id,url:j.job_url})):null};
  },
  async claim(userId,slot,mode,version){return await rpc('claim_radar_dispatch',{p_user:userId,p_slot:slot,p_mode:mode,p_version:version});},
  async reserve(id,jobs){return await rpc('reserve_radar_jobs',{p_dispatch:id,p_jobs:jobs.map(job=>({id:job.id,url:job.url,canonical:canonicalRadarJobUrl(job.url)}))});},
  async gate(id,version){return await rpc('gate_radar_dispatch',{p_dispatch:id,p_version:version});},
  async finish(id,state,code,providerId){await rpc('finish_radar_dispatch',{p_dispatch:id,p_state:state,p_code:code,p_provider:providerId||null});},
 };
}
