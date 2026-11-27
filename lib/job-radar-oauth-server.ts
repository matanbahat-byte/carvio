import {createClient} from '@supabase/supabase-js';
import {createRadarOAuth,unseal,type OAuthConfig,type OAuthConnection,type OAuthStore} from './job-radar-oauth.ts';
import type {GmailCredentials} from './job-radar-gmail.ts';
import {RADAR_SENDER} from './job-radar-schedule.ts';
export function storedRadarGmailCredentials(row:OAuthConnection,config:OAuthConfig,now=Date.now()):GmailCredentials {
  if(row.sender!==RADAR_SENDER||row.client_id!==config.clientId||!Number.isFinite(Date.parse(row.verified_at))||Date.parse(row.verified_at)>now)throw Error('oauth_connection_invalid');
  if(row.refresh_expires_at!==null&&(!Number.isFinite(Date.parse(row.refresh_expires_at))||Date.parse(row.refresh_expires_at)<=now))throw Error('oauth_connection_expired');
  if(!row.scopes.includes('https://www.googleapis.com/auth/gmail.send'))throw Error('oauth_connection_scope');
  const refreshToken=unseal(row.encrypted_refresh_token,config,'refresh-token');
  if(!refreshToken)throw Error('oauth_connection_invalid');
  return {clientId:config.clientId,clientSecret:config.clientSecret,refreshToken};
}
// Used only by a separately reviewed live runner. Loading credentials never sends.
export async function loadStoredRadarGmailCredentials(env:NodeJS.ProcessEnv=process.env):Promise<GmailCredentials> {
  if(env.RADAR_SUPABASE_URL!=='https://pzykndfxenwqnpvrbkby.supabase.co')throw Error('oauth_isolated_backend_required');
  const required=(name:string)=>{const value=env[name];if(!value)throw Error('oauth_configuration');return value;};
  const config:OAuthConfig={origin:required('RADAR_GMAIL_OAUTH_ORIGIN'),clientId:required('RADAR_GMAIL_CLIENT_ID'),clientSecret:required('RADAR_GMAIL_CLIENT_SECRET'),encryptionKey:required('RADAR_GMAIL_ENCRYPTION_KEY'),setupToken:required('RADAR_GMAIL_SETUP_TOKEN')};
  const db=createClient(env.RADAR_SUPABASE_URL,required('RADAR_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await db.from('job_radar_oauth_connections').select().eq('sender',RADAR_SENDER).abortSignal(AbortSignal.timeout(10000)).single();
  if(result.error||!result.data)throw Error('oauth_connection_unavailable');
  return storedRadarGmailCredentials(result.data,config);
}
// No NEXT_PUBLIC variables or application-login sessions are used here.
export function radarOAuthFromEnvironment(env:NodeJS.ProcessEnv=process.env) {
  if(env.RADAR_GMAIL_SETUP_ENABLED!=='true')return null;
  if(env.RADAR_SUPABASE_URL!=='https://pzykndfxenwqnpvrbkby.supabase.co')throw Error('oauth_isolated_backend_required');
  const required=(name:string)=>{const value=env[name];if(!value)throw Error('oauth_configuration');return value;};
  const config:OAuthConfig={origin:required('RADAR_GMAIL_OAUTH_ORIGIN'),clientId:required('RADAR_GMAIL_CLIENT_ID'),clientSecret:required('RADAR_GMAIL_CLIENT_SECRET'),encryptionKey:required('RADAR_GMAIL_ENCRYPTION_KEY'),setupToken:required('RADAR_GMAIL_SETUP_TOKEN')};
  const db=createClient(env.RADAR_SUPABASE_URL,required('RADAR_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const store:OAuthStore={
    async putState(row){
      const cleanup=await db.from('job_radar_oauth_states').delete().lt('expires_at',new Date().toISOString()).abortSignal(AbortSignal.timeout(10000));
      if(cleanup.error)throw Error('oauth_storage');
      const result=await db.from('job_radar_oauth_states').insert(row).abortSignal(AbortSignal.timeout(10000));if(result.error)throw Error('oauth_storage');
    },
    async takeState(hash,binding,now){
      const result=await db.from('job_radar_oauth_states').delete().eq('state_hash',hash).eq('binding_hash',binding).gt('expires_at',now).select().abortSignal(AbortSignal.timeout(10000));
      if(result.error)throw Error('oauth_storage');return result.data?.[0]||null;
    },
    async saveConnection(row){
      const result=await db.from('job_radar_oauth_connections').upsert(row,{onConflict:'sender'}).abortSignal(AbortSignal.timeout(10000));if(result.error)throw Error('oauth_storage');
    },
  };
  return createRadarOAuth(config,store);
}
export async function handleRadarOAuth(req:Request,action:'page'|'start'|'callback') {
  try {
    const oauth=radarOAuthFromEnvironment();
    if(!oauth)return new Response('Unavailable',{status:404,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    return await oauth[action](req);
  }catch{
    // Deliberately omit exception details, provider payloads, credentials and URLs.
    return new Response('Gmail setup unavailable. Sending remains OFF.',{status:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
}
