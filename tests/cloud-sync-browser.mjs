/** Real browser + Supabase client; isolated in-memory Auth/PostgREST fixture, never production. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3121',output='artifacts/cloud-sync';
await mkdir(output,{recursive:true});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const rows=new Map(),errors=[],requests=[],analytics=[],deniedRequests=[];let slowNextWrite=false,writeStarted,releaseWrite;
const jwt=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture-signature';
async function device(id,mobile=false,seed=[],handoff=""){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
 const user={id,email:`${id===A?'alice':'bob'}@example.test`,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const session={access_token:jwt(id),refresh_token:'isolated-fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 await context.addCookies([{name:'sb-cloud-fixture-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:base,sameSite:'Lax'}]);
 await context.addInitScript(({seed})=>{if(!localStorage.getItem('fixture-seeded')){localStorage.setItem('carvio.applications.v1',JSON.stringify(seed));localStorage.setItem('carvio.language.v1','"en"');localStorage.setItem('fixture-seeded','1');localStorage.setItem('carvio.cloud-autosync.v1','off');localStorage.setItem('carvio.cloud-autosync.v3:11111111-1111-4111-8111-111111111111','off');}},{seed});
 await context.route('https://cloud-fixture.invalid/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','content-type':'application/json'};
  const send=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname.startsWith('/auth/')){const token=req.headers().authorization?.split(' ')[1];const authId=token?.split('.')[1]?JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub:id;return send(url.pathname.endsWith('/user')?{...user,id:authId,email:`${authId===A?'alice':'bob'}@example.test`}:{});}
  if(url.pathname.endsWith('/product_events')){
   const actor=JSON.parse(Buffer.from((req.headers().authorization||'').split(' ')[1].split('.')[1],'base64url')).sub;
   assert.match(req.headers().prefer||'',/resolution=ignore-duplicates/);
   if(req.postDataJSON().some(row=>row.user_id!==actor)){deniedRequests.push({table:'product_events',actor});return send({code:'42501',message:'ownership policy'},403);}
   for(const row of req.postDataJSON()){assert.equal(row.user_id,actor,'accepted analytics crossed accounts');assert.ok(row.properties.sessionId);if(row.event_name==='session_started')assert.equal(row.id,row.properties.sessionId);if(row.event_name==='acquisition_attributed')assert.equal(row.id,actor);analytics.push(row);}
   return send([],201);
  }
  assert.ok(url.pathname.endsWith('/user_workspaces'),url.pathname);
  const actor=JSON.parse(Buffer.from((req.headers().authorization||'').split(' ')[1].split('.')[1],'base64url')).sub;
  const incoming=method==='POST'||method==='PATCH'?req.postDataJSON():null;
  const owner=incoming?.user_id||url.searchParams.get('user_id')?.slice(3);
  const represent=data=>req.headers().accept?.includes('vnd.pgrst.object')?(data[0]||null):data;
  // An auth-cookie change may race an already-started request. Model real RLS:
  // reads/updates see no foreign rows, and foreign inserts are forbidden.
  if(owner!==actor){deniedRequests.push({table:'user_workspaces',actor,owner,method});return method==='GET'||method==='PATCH'?send(represent([])):send({code:'42501',message:'ownership policy'},403);}
  requests.push({actor,owner,method});
  if(method==='GET'){const row=rows.get(owner);const fields=url.searchParams.get('select');return send(represent(row?[fields==='updated_at'?{updated_at:row.updated_at}:structuredClone(row)]:[]));}
  if(slowNextWrite){slowNextWrite=false;writeStarted?.();await new Promise(r=>{releaseWrite=r;});}
  if(method==='POST'&&rows.has(owner))return send({code:'23505',message:'already exists'},409);
  if(method==='PATCH'&&rows.get(owner)?.updated_at!==url.searchParams.get('updated_at')?.slice(3))return send(represent([]));
  rows.set(owner,structuredClone(incoming));return send(represent([{updated_at:incoming.updated_at}]),method==='POST'?201:200);
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/?workspace=1${handoff}`);await page.locator('.hero-cloud-button').waitFor({timeout:30000,state:handoff?'attached':'visible'});
 return {context,page,id};
}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.applications.v1')||'[]'));
const waitFor=async(check,label,limit=100)=>{for(let i=0;i<limit;i++){if(await check())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout: '+label);};
const navigateApplications=async page=>{const mobile=page.viewportSize().width<768;await page.locator(mobile?'.calm-mobile-nav button':'.calm-desktop-nav .calm-nav-button').nth(1).click();};
const add=async(page,company)=>{await navigateApplications(page);await page.getByRole('button',{name:'Add application',exact:true}).first().click();await page.locator('#application-company').fill(company);await page.locator('#application-role').fill('Engineer');await page.getByRole('dialog').getByRole('button',{name:'Add application',exact:true}).click();};
try{
 const phone=await device(A,true,[{id:'phone-1',company:'Phone One',role:'Engineer'},{id:'phone-2',company:'Phone Two',role:'Designer'}]);
 await waitFor(()=>rows.get(A)?.workspace_data.applications.length===2,'phone automatic upload');
 await waitFor(async()=>await phone.page.locator('.cloud-status-mobile').isVisible()&&(await phone.page.locator('.cloud-status-mobile').innerText())==='Synced','visible mobile sync acknowledgement');
 assert.ok(await phone.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const desktop=await device(A);await waitFor(async()=>(await stored(desktop.page)).length===2,'desktop automatic pull');
 await desktop.page.screenshot({path:`${output}/desktop-two-phone-applications.png`});
 await add(desktop.page,'Desktop Three');await waitFor(()=>rows.get(A)?.workspace_data.applications.length===3,'desktop automatic save');
 await phone.page.reload();await waitFor(async()=>(await stored(phone.page)).length===3,'phone refresh continuity');
 await phone.page.screenshot({path:`${output}/phone-three-applications.png`});
 // A slow request must not discard a second application saved while it is in flight.
 slowNextWrite=true;const started=new Promise(r=>{writeStarted=r;});await add(phone.page,'Slow Four');await started;
 await add(phone.page,'During Slow Five');releaseWrite();await waitFor(()=>rows.get(A)?.workspace_data.applications.length===5,'dirty replay');
 await desktop.page.bringToFront();await waitFor(async()=>(await stored(desktop.page)).length===5,'desktop updates automatically without reload or sync click',400);
 // Isolated second account neither sees nor uploads A's data.
 const bob=await device(B);await waitFor(()=>rows.has(B),'second account initialization');assert.equal(rows.get(B).workspace_data.applications.length,0);assert.ok(!(await bob.page.locator('body').innerText()).includes('Phone One'));
 // Existing owned device switched to another account is locked before private hydration.
 await desktop.context.clearCookies();const replacement={access_token:jwt(B),refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:B,email:'bob@example.test',aud:'authenticated',app_metadata:{},user_metadata:{}}};
 await desktop.context.addCookies([{name:'sb-cloud-fixture-auth-token',value:'base64-'+Buffer.from(JSON.stringify(replacement)).toString('base64url'),url:base,sameSite:'Lax'}]);
 await desktop.page.reload();await desktop.page.locator('#workspace-locked-title').waitFor();assert.ok(!(await desktop.page.locator('body').innerText()).includes('Phone One'));assert.equal((await stored(desktop.page)).length,5);
 await desktop.page.screenshot({path:`${output}/account-switch-preserved-and-locked.png`});
 // A simulated network interruption preserves the phone record and retries on reconnect.
 await phone.context.setOffline(true);await add(phone.page,'Offline Six');assert.equal((await stored(phone.page)).length,6);assert.equal(rows.get(A).workspace_data.applications.length,5);
 await phone.context.setOffline(false);await waitFor(()=>rows.get(A)?.workspace_data.applications.length===6,'online recovery');
 // A local-only reset must invalidate the baseline, not erase the cloud on re-enable.
 await phone.page.evaluate(()=>{window.dispatchEvent(new Event('carvio:disable-cloud-autosync'));localStorage.setItem('carvio.applications.v1','[]');});
 assert.equal(await phone.page.evaluate(id=>localStorage.getItem(`carvio.sync-checkpoint.v1:${id}`),A),null);
 await phone.page.reload();await phone.page.locator('.hero-cloud-button').waitFor();assert.equal(rows.get(A).workspace_data.applications.length,6);
 await waitFor(async()=>(await stored(phone.page)).length===6,'automatic resume after local reset without pressing any sync button');assert.equal(rows.get(A).workspace_data.applications.length,6);
 // Explicit public-search intent survives initial authenticated cloud restoration.
 const handoff=await device(A,false,[], '&'+new URLSearchParams({findRole:'מנהל מוצר',findCountry:'Israel',findCity:'Tel Aviv',findLang:'he'}));
 await waitFor(async()=>(await stored(handoff.page)).length===6,'handoff preserves cloud applications');
 await waitFor(()=>rows.get(A)?.workspace_data.searchProfile.role==='מנהל מוצר','handoff automatically persists its newer search');
 assert.equal(await handoff.page.locator('input[list=carvio-role-options]').inputValue(),'מנהל מוצר');
 assert.equal(await handoff.page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.language.v1'))),'he');
 await handoff.context.close();
 assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.actor===r.owner));
 const aSessions=new Set(analytics.filter(e=>e.user_id===A).map(e=>e.properties.sessionId));const bSessions=new Set(analytics.filter(e=>e.user_id===B).map(e=>e.properties.sessionId));assert.ok(aSessions.size&&bSessions.size);assert.ok([...aSessions].every(id=>!bSessions.has(id)));
 await writeFile(`${output}/report.json`,JSON.stringify({environment:'isolated Auth/PostgREST fixture; no real credentials or production writes',checks:['phone two applications -> desktop','desktop -> phone after reload','slow-write replay','second-account isolation','account switch locks private workspace without deleting it','offline local recovery -> online sync','local reset preserves cloud on re-enable'],requests:requests.length,analyticsEvents:analytics.length,deniedCrossAccountRequests:deniedRequests.length,analyticsAccountIsolation:true,browserErrors:errors},null,2));
 console.log('PASS: two browser contexts, six preserved applications, account isolation, slow writes and offline recovery');
}finally{await browser.close();}
