import test from 'node:test';
import assert from 'node:assert/strict';
import {createRadarOAuth,seal,unseal,OAUTH_PATH,OAUTH_CALLBACK} from '../lib/job-radar-oauth.ts';
import {radarOAuthFromEnvironment,storedRadarGmailCredentials} from '../lib/job-radar-oauth-server.ts';
const config={origin:'https://fixture.example.test',clientId:'fixture-client',clientSecret:'fixture-secret',encryptionKey:Buffer.alloc(32,7).toString('base64url'),setupToken:'fixture-operator-'.repeat(4)};
const sendScope='https://www.googleapis.com/auth/gmail.send';
const scopes=`openid email ${sendScope}`;
function fixture(patch={}){
 const rows=new Map();const saved=[];const calls=[];let now=1_800_000_000_000;
 const store={
  async putState(row){if(patch.storeDown)throw Error('fixture');rows.set(row.state_hash,row);},
  async takeState(hash,binding,time){const row=rows.get(hash);if(!row||row.binding_hash!==binding||row.expires_at<=time)return null;rows.delete(hash);return row;},
  async saveConnection(row){if(patch.saveDown)throw Error('fixture-secret');saved.push(row);},
 };
 const request=async(url,init)=>{
  calls.push({url,init});
  if(patch.timeout)throw Error('fixture-secret');
  if(url.endsWith('/userinfo'))return Response.json(patch.profile||{email:'carvio.team@gmail.com',email_verified:true});
  const grant=new URLSearchParams(init.body).get('grant_type');
  if(grant==='refresh_token'&&patch.refreshFailed)return new Response('fixture-secret',{status:400});
  return Response.json(grant==='authorization_code'?{access_token:'fixture-access',refresh_token:'fixture-refresh',scope:scopes,...patch.tokens}:{access_token:'fixture-refreshed',scope:scopes,...patch.refreshed});
 };
 const flow=createRadarOAuth(config,store,request,()=>now);
 const start=(token=config.setupToken,origin=config.origin)=>flow.start(new Request(config.origin+OAUTH_PATH,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({setup_token:token})}));
 const callback=(url,cookie)=>flow.callback(new Request(url,{headers:cookie?{cookie}:{}}));
 return {flow,rows,saved,calls,start,callback,advance(ms){now+=ms;}};
}
async function begun(f){const response=await f.start();assert.equal(response.status,303);const location=new URL(response.headers.get('location'));const state=location.searchParams.get('state');const cookie=response.headers.get('set-cookie').split(';')[0];return {location,state,cookie,url:config.origin+OAUTH_CALLBACK+'?state='+state+'&code=fixture-code'};}
test('provisioning is disabled by default and cannot target production database',()=>{
 assert.equal(radarOAuthFromEnvironment({}),null);
 assert.throws(()=>radarOAuthFromEnvironment({RADAR_GMAIL_SETUP_ENABLED:'true',RADAR_SUPABASE_URL:'https://production.example.test'}),/isolated/);
});
test('ciphertext authenticates key, sender-client-origin binding and purpose',()=>{
 const encrypted=seal('fixture-refresh',config,'refresh-token');assert.ok(!encrypted.includes('fixture-refresh'));assert.equal(unseal(encrypted,config,'refresh-token'),'fixture-refresh');
 assert.notEqual(seal('fixture-refresh',config,'refresh-token'),encrypted);
 for(const [cfg,purpose,value] of [[{...config,clientId:'other'},'refresh-token',encrypted],[{...config,origin:'https://other.test'},'refresh-token',encrypted],[config,'state',encrypted],[config,'refresh-token',encrypted.slice(0,-5)+'AAAAA']])assert.throws(()=>unseal(value,cfg,purpose));
});
test('start requires operator authorization and same origin before writing state or contacting Google',async()=>{
 const f=fixture();assert.equal((await f.start('wrong')).status,403);assert.equal((await f.start(config.setupToken,'https://evil.test')).status,403);assert.equal(f.rows.size,0);assert.equal(f.calls.length,0);
 const oversized=new Request(config.origin+OAUTH_PATH,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/x-www-form-urlencoded'},body:'x'.repeat(3000)});assert.equal((await f.flow.start(oversized)).status,413);
});
test('authorization uses minimal scopes, offline access, PKCE, bound secure cookie and fixed callback',async()=>{
 const f=fixture();const b=await begun(f);assert.equal(b.location.origin,'https://accounts.google.com');assert.equal(b.location.searchParams.get('redirect_uri'),config.origin+OAUTH_CALLBACK);assert.equal(b.location.searchParams.get('login_hint'),'carvio.team@gmail.com');assert.equal(b.location.searchParams.get('access_type'),'offline');assert.equal(b.location.searchParams.get('scope'),scopes);assert.equal(b.location.searchParams.get('code_challenge_method'),'S256');assert.equal(b.location.searchParams.get('include_granted_scopes'),'false');
 const row=[...f.rows.values()][0];assert.ok(!row.encrypted_verifier.includes('fixture'));assert.ok(!JSON.stringify(row).includes(b.state));assert.equal(f.calls.length,0);
 const r=await f.start();assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
});
test('successful callback verifies identity twice and offline refresh before saving encrypted credentials, never sends',async()=>{
 const f=fixture();const b=await begun(f);const r=await f.callback(b.url,b.cookie);assert.equal(r.status,200);assert.match(await r.text(),/Sending remains OFF/);assert.equal(f.saved.length,1);const row=f.saved[0];assert.equal(row.sender,'carvio.team@gmail.com');assert.equal(unseal(row.encrypted_refresh_token,config,'refresh-token'),'fixture-refresh');assert.equal(row.refresh_expires_at,null);assert.equal(f.calls.length,4);assert.ok(f.calls.every(c=>!c.url.includes('/messages/')));assert.equal(f.rows.size,0);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');
 const body=new URLSearchParams(f.calls[0].init.body);assert.ok(body.get('code_verifier'));assert.equal(body.get('client_secret'),config.clientSecret);
 assert.equal((await f.callback(b.url,b.cookie)).status,400);assert.equal(f.calls.length,4);
});
test('missing/wrong browser binding, wrong state, expiry and concurrent replay fail closed',async()=>{
 const f=fixture();const b=await begun(f);for(const cookie of [undefined,'__Host-carvio-radar-oauth='+'x'.repeat(43),b.cookie+'; '+b.cookie])assert.equal((await f.callback(b.url,cookie)).status,400);
 assert.equal((await f.callback(b.url.replace(b.state,'z'.repeat(43)),b.cookie)).status,400);assert.equal(f.calls.length,0);
 const results=await Promise.all([f.callback(b.url,b.cookie),f.callback(b.url,b.cookie)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);assert.equal(f.saved.length,1);
 const expired=fixture();const e=await begun(expired);expired.advance(600001);assert.equal((await expired.callback(e.url,e.cookie)).status,400);assert.equal(expired.calls.length,0);
});
test('denial consumes state and never contacts token endpoint',async()=>{
 const f=fixture();const b=await begun(f);assert.equal((await f.callback(b.url+'&error=access_denied',b.cookie)).status,400);assert.equal(f.rows.size,0);assert.equal(f.calls.length,0);
});
for(const [name,patch] of [
 ['wrong account',{profile:{email:'personal@example.test',email_verified:true}}],['unverified account',{profile:{email:'carvio.team@gmail.com',email_verified:false}}],
 ['missing send scope',{tokens:{scope:'openid email'}}],['broad permissions',{tokens:{scope:scopes+' https://mail.google.com/'}}],['missing refresh token',{tokens:{refresh_token:undefined}}],
 ['refresh fails',{refreshFailed:true}],['refresh scope reduced',{refreshed:{scope:'openid email'}}],['provider timeout',{timeout:true}],['storage failure',{saveDown:true}],['invalid expiry',{tokens:{refresh_token_expires_in:-1}}],
])test(name+' never saves usable credentials or discloses provider details',async()=>{
 const f=fixture(patch);const b=await begun(f);const response=await f.callback(b.url,b.cookie);assert.equal(response.status,400);assert.equal(f.saved.length,0);assert.doesNotMatch(await response.text(),/fixture-secret|fixture-refresh|fixture-access/);assert.ok(f.calls.every(c=>!c.url.includes('/messages/')));
});
test('expiring Google refresh tokens retain expiry metadata',async()=>{
 const f=fixture({tokens:{refresh_token_expires_in:604800}});const b=await begun(f);assert.equal((await f.callback(b.url,b.cookie)).status,200);assert.ok(f.saved[0].refresh_expires_at>f.saved[0].verified_at);
});
test('store outage prevents OAuth redirect and never echoes secrets',async()=>{
 const f=fixture({storeDown:true});const r=await f.start();assert.equal(r.status,503);assert.equal(r.headers.get('location'),null);assert.equal(f.calls.length,0);assert.doesNotMatch(await r.text(),/fixture-secret/);
});
test('runtime adapter rejects expired, wrong-client and tampered stored credentials',async()=>{
 const f=fixture();const b=await begun(f);await f.callback(b.url,b.cookie);const row=f.saved[0];const now=Date.parse(row.verified_at);
 assert.deepEqual(storedRadarGmailCredentials(row,config,now),{clientId:config.clientId,clientSecret:config.clientSecret,refreshToken:'fixture-refresh'});
 for(const patch of [{sender:'personal@example.test'},{client_id:'other'},{refresh_expires_at:new Date(now-1).toISOString()},{encrypted_refresh_token:'v1.invalid.bad.data'},{scopes:[]}])assert.throws(()=>storedRadarGmailCredentials({...row,...patch},config,now));
});
