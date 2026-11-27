// Server only. This provisioning flow has no message-sending capability.
import {createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual} from 'node:crypto';
import {RADAR_SENDER} from './job-radar-schedule.ts';
export const OAUTH_PATH = '/api/admin/job-radar/gmail';
export const OAUTH_CALLBACK = `${OAUTH_PATH}/callback`;
const SEND = 'https://www.googleapis.com/auth/gmail.send';
const EMAIL = 'https://www.googleapis.com/auth/userinfo.email';
const COOKIE = '__Host-carvio-radar-oauth';
const TTL = 600;
export type OAuthConfig = {origin:string; clientId:string; clientSecret:string; encryptionKey:string; setupToken:string};
export type OAuthState = {state_hash:string; binding_hash:string; encrypted_verifier:string; expires_at:string};
export type OAuthConnection = {sender:string; client_id:string; encrypted_refresh_token:string; scopes:string[]; verified_at:string; refresh_expires_at:string|null};
export interface OAuthStore {
  putState(state:OAuthState):Promise<void>;
  // Must atomically consume a matching, unexpired row. Never implement read-then-delete.
  takeState(stateHash:string,bindingHash:string,now:string):Promise<OAuthState|null>;
  saveConnection(connection:OAuthConnection):Promise<void>;
}
export function digest(value:string) {return createHash('sha256').update(value).digest('hex');}
function key(config:OAuthConfig) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(config.encryptionKey))throw Error('oauth_configuration');
  const value=Buffer.from(config.encryptionKey,'base64url');
  if(value.length!==32)throw Error('oauth_configuration');return value;
}
export function seal(value:string,config:OAuthConfig,purpose:string) {
  const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(config),iv);
  cipher.setAAD(Buffer.from(`${RADAR_SENDER}|${config.clientId}|${config.origin}|${purpose}`));
  const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.');
}
export function unseal(value:string,config:OAuthConfig,purpose:string) {
  const [version,iv,tag,data,...extra]=value.split('.');
  if(version!=='v1'||!iv||!tag||!data||extra.length)throw Error('oauth_ciphertext');
  const decipher=createDecipheriv('aes-256-gcm',key(config),Buffer.from(iv,'base64url'));
  decipher.setAAD(Buffer.from(`${RADAR_SENDER}|${config.clientId}|${config.origin}|${purpose}`));
  decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8');
}
function validConfig(config:OAuthConfig) {
  const u=new URL(config.origin);
  if(u.protocol!=='https:'||u.origin!==config.origin||!config.clientId||!config.clientSecret||config.setupToken.length<43)throw Error('oauth_configuration');
  key(config);
}
const headers = {'Cache-Control':'no-store, max-age=0','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'none'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'none'"};
function reply(text:string,status=200,cookie?:string) {
  return new Response(text,{status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8',...(cookie?{'Set-Cookie':cookie}:{})}});
}
const clearCookie=`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function createRadarOAuth(config:OAuthConfig,store:OAuthStore,request:typeof fetch=fetch,clock:()=>number=Date.now) {
  validConfig(config);
  async function json(url:string,init:RequestInit) {
    const response=await request(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('oauth_provider_failed');return response.json();
  }
  function assertScopes(value:unknown) {
    if(typeof value!=='string')throw Error('oauth_scope_missing');
    const scopes=new Set(value.split(/\s+/));
    if(!scopes.has(SEND)||!scopes.has('openid')||(!scopes.has(EMAIL)&&!scopes.has('email')))throw Error('oauth_scope_missing');
    // A dedicated sender client must not carry broad read/modify/mailbox access.
    if([...scopes].some(s=>![SEND,EMAIL,'email','openid'].includes(s)))throw Error('oauth_scope_excess');
    return [...scopes].sort();
  }
  async function identity(token:unknown) {
    if(typeof token!=='string'||!token)throw Error('oauth_access_missing');
    const profile=await json('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token}`}});
    if(profile.email!==RADAR_SENDER||profile.email_verified!==true)throw Error('oauth_wrong_sender');
  }
  return {
    page(req:Request) {
      if(new URL(req.url).origin!==config.origin)return reply('Unavailable',404);
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CARVIO Gmail setup</title><h1>Connect CARVIO Gmail</h1><p>Use carvio.team@gmail.com only. Connecting does not enable sending.</p><form method="post"><label>Operator setup key <input name="setup_token" type="password" required autocomplete="off" maxlength="256"></label><button>Continue to Google</button></form></html>',{headers:{...headers,'Referrer-Policy':'same-origin','Content-Type':'text/html; charset=utf-8'}});
    },
    async start(req:Request) {
      if(new URL(req.url).origin!==config.origin||req.headers.get('origin')!==config.origin)return reply('Forbidden',403);
      if(req.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded')return reply('Unsupported form',415);
      // Bound streaming input even when Content-Length is missing or dishonest.
      const reader=req.body?.getReader();if(!reader)return reply('Invalid form',400);
      let body='';let size=0;
      try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply('Form too large',413);}body+=Buffer.from(value).toString('utf8');}}catch{return reply('Invalid form',400);}
      const supplied=new URLSearchParams(body).get('setup_token')||'';
      if(!timingSafeEqual(Buffer.from(digest(supplied),'hex'),Buffer.from(digest(config.setupToken),'hex')))return reply('Forbidden',403);
      const state=randomBytes(32).toString('base64url');const binding=randomBytes(32).toString('base64url');const verifier=randomBytes(32).toString('base64url');
      try {
        await store.putState({state_hash:digest(state),binding_hash:digest(binding),encrypted_verifier:seal(verifier,config,`state:${digest(state)}`),expires_at:new Date(clock()+TTL*1000).toISOString()});
        const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
        url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.origin+OAUTH_CALLBACK,response_type:'code',scope:`openid email ${SEND}`,access_type:'offline',prompt:'consent select_account',login_hint:RADAR_SENDER,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',include_granted_scopes:'false'}).toString();
        return new Response(null,{status:303,headers:{...headers,Location:url.href,'Set-Cookie':`${COOKIE}=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`}});
      }catch{return reply('Connection setup unavailable. No sending was enabled.',503);}
    },
    async callback(req:Request) {
      const url=new URL(req.url);const state=url.searchParams.get('state')||'';
      const bindings=(req.headers.get('cookie')||'').split(';').map(c=>c.trim()).filter(c=>c.startsWith(COOKIE+'='));
      const binding=bindings.length===1?bindings[0].slice(COOKIE.length+1):'';
      if(url.origin!==config.origin||! /^[A-Za-z0-9_-]{43}$/.test(state)||! /^[A-Za-z0-9_-]{43}$/.test(binding))return reply('Invalid or expired connection. Start again.',400,clearCookie);
      try {
        const row=await store.takeState(digest(state),digest(binding),new Date(clock()).toISOString());
        if(!row)throw Error('oauth_state_invalid');
        // Error/cancellation consumes state too. Never forward Google's error text.
        const code=url.searchParams.get('code');
        if(url.searchParams.has('error')||!code||code.length>4096)throw Error('oauth_cancelled');
        const verifier=unseal(row.encrypted_verifier,config,`state:${digest(state)}`);
        const credentials={client_id:config.clientId,client_secret:config.clientSecret};
        const tokens=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...credentials,code,code_verifier:verifier,redirect_uri:config.origin+OAUTH_CALLBACK,grant_type:'authorization_code'})});
        const scopes=assertScopes(tokens.scope);
        if(typeof tokens.refresh_token!=='string'||!tokens.refresh_token||tokens.refresh_token.length>16384)throw Error('oauth_refresh_missing');
        await identity(tokens.access_token);
        // Prove offline refresh works and that its identity is still the same sender.
        const refreshed=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...credentials,refresh_token:tokens.refresh_token,grant_type:'refresh_token'})});
        if(refreshed.scope!==undefined)assertScopes(refreshed.scope);
        await identity(refreshed.access_token);
        const lifetime=tokens.refresh_token_expires_in;
        if(lifetime!==undefined&&(!Number.isSafeInteger(lifetime)||lifetime<=0))throw Error('oauth_refresh_expiry');
        await store.saveConnection({sender:RADAR_SENDER,client_id:config.clientId,encrypted_refresh_token:seal(tokens.refresh_token,config,'refresh-token'),scopes,verified_at:new Date(clock()).toISOString(),refresh_expires_at:lifetime===undefined?null:new Date(clock()+lifetime*1000).toISOString()});
        return reply('CARVIO Gmail connected and saved securely. Sending remains OFF. You may close this page.',200,clearCookie);
      }catch{return reply('Connection was not completed. Start again with the CARVIO account. No sending was enabled.',400,clearCookie);}
    },
  };
}
