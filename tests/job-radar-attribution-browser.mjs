// Confirmed fictional account and simulated dispatch in carvio-dev only. No mail API.
import assert from 'node:assert/strict';import {request as httpRequest} from 'node:http';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';
import {createServerClient} from '@supabase/ssr';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'https://pzykndfxenwqnpvrbkby.supabase.co');
const jar=new Map();
const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar.values()],setAll:values=>values.forEach(c=>jar.set(c.name,c))}});
const auth=await client.auth.signInWithPassword({email:process.env.RADAR_TEST_EMAIL,password:process.env.RADAR_TEST_PASSWORD});assert.ifError(auth.error);
const userId=auth.data.user.id;
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);
const port=12000+Math.floor(Math.random()*20000);const base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});
let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/find')).ok){ready=true;break;}}catch{}await delay(100);}if(!ready){server.kill();throw Error('Local server not ready');}
const proxyUrl=process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
const browser=await chromium.launch({headless:true,args:c.args,executablePath:await c.executablePath(),...(proxyUrl?{proxy:{server:proxyUrl.origin,bypass:'127.0.0.1,localhost',username:decodeURIComponent(proxyUrl.username)||undefined,password:decodeURIComponent(proxyUrl.password)||undefined}}:{})});
try{
 const url=base+'/radar/jobs/'+process.env.RADAR_TEST_LISTING+'?lang=he&r='+process.env.RADAR_TEST_TOKEN;
 const guest=await browser.newContext({ignoreHTTPSErrors:true});const g=await guest.newPage();await g.goto(url);await g.getByRole('heading',{name:'Recruitment Manager',exact:true}).waitFor();
 const denied=await g.request.post(base+'/api/radar-events',{headers:{Origin:base},data:{token:process.env.RADAR_TEST_TOKEN,event:'clicked'}});assert.ok([401,403].includes(denied.status()));await guest.close();
 const owner=await browser.newContext({ignoreHTTPSErrors:true});
 // Forward through Playwright's HTTP engine to the real APIs: the managed
 // Chromium proxy rejects renderer POST/preflight. No payload/response is mocked.
 const bridge=async route=>{
  try{
   const request=route.request(),url=new URL(request.url()),original=await request.allHeaders();
   const headers=Object.fromEntries(Object.entries(original).filter(([k])=>!['host','content-length','connection','accept-encoding'].includes(k)&&!k.startsWith('sec-')));
   const body=request.postDataBuffer();
   if(url.origin===base){
    if(original['sec-fetch-site'])headers['sec-fetch-site']=original['sec-fetch-site'];
    // Interception happens before Chromium attaches all browser security headers.
    // Reconstruct a missing Origin only from this request's verified same-origin frame.
    if(!headers.origin&&new URL(request.frame().url()).origin===base)headers.origin=base;
    const response=await new Promise((resolve,reject)=>{const req=httpRequest(url,{method:request.method(),headers},res=>{const data=[];res.on('data',x=>data.push(x));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(data),contentType:res.headers['content-type']||'application/json'}));});req.on('error',reject);req.setTimeout(20000,()=>req.destroy(Error('Local API timeout')));req.end(body||undefined);});
    await route.fulfill(response);
   }else{
    const response=await fetch(url,{method:request.method(),headers,body:body||undefined,signal:AbortSignal.timeout(20000)});
    await route.fulfill({status:response.status,body:Buffer.from(await response.arrayBuffer()),headers:Object.fromEntries([...response.headers.entries()].filter(([k])=>!['content-encoding','content-length','transfer-encoding','connection'].includes(k)))});
   }
  }catch{await route.abort('failed');}
 };
 await owner.route('**/api/radar-events',bridge);
 await owner.route('https://pzykndfxenwqnpvrbkby.supabase.co/**',bridge);
 await owner.addCookies([...jar.values()].filter(c=>c.value).map(c=>({name:c.name,value:c.value,domain:'127.0.0.1',path:'/',sameSite:'Lax',secure:false})));
 const page=await owner.newPage();const recorded=new Set();const responses=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.url().includes('/api/radar-events'))errors.push(r.failure()?.errorText||'request failed');});
 page.on('response',async r=>{if(r.url().includes('/api/radar-events')){try{let data={};try{data=await r.json();}catch{}responses.push({status:r.status(),recorded:data.recorded??null,event:r.request().postDataJSON()?.event});if(data.recorded)recorded.add(r.request().postDataJSON().event);}catch{}}});
 await page.goto(url);await page.bringToFront();for(let i=0;i<400&&!recorded.has('clicked');i++)await delay(100);if(!recorded.has('clicked')){const probe=await client.auth.getUser();throw Error(JSON.stringify({message:'Authenticated landing not attributed',responses,errors,probe:{error:probe.error?.code,verified:!!probe.data.user?.email_confirmed_at},cookieNames:[...jar.keys()],browserState:await page.evaluate(()=>({contextPresent:!!sessionStorage.getItem('carvio.radar.attribution.v1'),visibility:document.visibilityState,entries:JSON.parse(sessionStorage.getItem('carvio.radar.attribution.v1')||'[]').map(e=>({type:typeof e.token,valid:e.expires>Date.now()}))})),guestStatus:denied.status()}));}assert.ok(!page.url().includes('&r='),'Token removed from visible URL');
 const now=new Date().toISOString();
 const workspace={schemaVersion:1,applications:[{id:'app-radar-browser',role:'Recruitment Manager',company:'Fictional Mint Team',jobUrl:'https://boards.greenhouse.io/carvio-analytics-fixture/jobs/93001',status:'Applied',capturedAt:now,lastActivityAt:now}],contacts:[],resumes:[],recoveryEntries:[],actionEvents:[{id:'fixture-saved',targetId:'app-radar-browser',name:'opportunity_saved',occurredAt:now,properties:{}},{id:'fixture-applied',targetId:'app-radar-browser',name:'marked_applied',occurredAt:now,properties:{}}],language:'he',dailyMood:'',theme:'light',searchProfile:{},userProfile:{}};
 const saved=await client.from('user_workspaces').upsert({user_id:userId,workspace_data:workspace,schema_version:1,updated_at:now});assert.ifError(saved.error);
 await page.goto(base+'/?workspace=1&findLang=he');for(let i=0;i<600&&!['returned','saved','applied'].every(e=>recorded.has(e));i++)await delay(100);
 assert.ok(['returned','saved','applied'].every(e=>recorded.has(e)),'Cloud-backed actions attributed through actual authenticated API');
 await page.reload();await delay(500);assert.ok(!page.url().includes(process.env.RADAR_TEST_TOKEN));
 console.log('PASS real dev browser/API: guest denied, authenticated click, URL cleanup, workspace return, synced save/self-reported application and replay-safe recording; no email API');
 await owner.close();
}finally{await browser.close();server.kill();await client.auth.signOut();}
