/** Opt-in hosted acceptance. Uses a real, dedicated QA account; never a customer session. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const project='uvaurzhmziscgfqbgopt';
const email='carvio.team+qa-sync-20261126@gmail.com';
assert.equal(process.env.CARVIO_QA_ALLOW_TEST_WRITES,'yes','Explicit test-account write authorization required');
assert.ok(process.env.CARVIO_QA_SESSION_FILE,'Provide a private real Auth session file');
assert.ok(process.env.CARVIO_QA_ANON_KEY,'Publishable/anon key required; never use an admin key');
let session;
try { session=JSON.parse(await readFile(process.env.CARVIO_QA_SESSION_FILE,'utf8')); } catch { throw new Error('Cannot read private QA session; no credentials are logged'); }
const key=process.env.CARVIO_QA_ANON_KEY;
assert.ok(key.startsWith('sb_publishable_') || JSON.parse(Buffer.from(key.split('.')[1]||'', 'base64url').toString()).role==='anon','Only a public anon/publishable key is allowed');
assert.equal(session.user?.email,email,'Only the approved dedicated test account may be used');
assert.ok(session.access_token&&session.expires_at>Date.now()/1000+300,'Real session must have at least five minutes remaining');
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};
if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
if(process.env.HTTPS_PROXY)launch.proxy={server:process.env.HTTPS_PROXY};
const browser=await chromium.launch(launch);
const base='https://carvio-pi.vercel.app',api=`https://${project}.supabase.co/rest/v1/user_workspaces`;
const output=process.env.CARVIO_QA_OUTPUT||'artifacts/hosted-cloud-sync';
await mkdir(output,{recursive:true});
const errors=[],contexts=[],checks=[];
const headers={apikey:process.env.CARVIO_QA_ANON_KEY,authorization:`Bearer ${session.access_token}`};
const waitFor=async(check,label)=>{const started=Date.now();while(Date.now()-started<60000){if(await check()){checks.push({name:label,elapsedMs:Date.now()-started});return;}await new Promise(r=>setTimeout(r,1000));}throw new Error(`Timed out: ${label}`);};
async function remote(request){const r=await request.get(`${api}?select=workspace_data&user_id=eq.${session.user.id}`,{headers});assert.equal(r.status(),200,'Real workspace read must succeed');return (await r.json())[0]?.workspace_data;}
const local=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.applications.v1')||'[]'));
async function device(mobile){
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});contexts.push(context);
 await context.addCookies([{name:`sb-${project}-auth-token`,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:base,sameSite:'Lax'}]);
 await context.addInitScript(()=>{if(!localStorage.getItem('qa-locale')){localStorage.setItem('carvio.language.v1','"en"');localStorage.setItem('qa-locale','1');}});
 // Suppress only test analytics; Auth and every workspace request use the actual hosted backend.
 await context.route('**/rest/v1/product_events*',r=>r.fulfill({status:204}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/?workspace=1`);await page.locator('.hero-cloud-button').waitFor();
 return {context,page};
}
async function applications(page){await page.locator(page.viewportSize().width<768?'.calm-mobile-nav button':'.calm-desktop-nav .calm-nav-button').nth(1).click();}
async function add(page,number){await applications(page);await page.getByRole('button',{name:'Add application',exact:true}).first().click();await page.locator('#application-company').fill(`CARVIO QA Fictional ${number}`);await page.locator('#application-role').fill(`QA Engineer ${number}`);await page.getByRole('dialog').getByRole('button',{name:'Add application',exact:true}).click();}
try{
 const probe=await browser.newContext({ignoreHTTPSErrors:true});contexts.push(probe);
 assert.equal(await remote(probe.request),undefined,'Refuse to modify a pre-existing cloud workspace');
 const anonymous=await probe.request.get(`${api}?select=user_id&limit=1`,{headers:{apikey:process.env.CARVIO_QA_ANON_KEY}});
 assert.equal(anonymous.status(),200);assert.deepEqual(await anonymous.json(),[]);checks.push({name:'anonymous API sees no workspaces'});
 const phone=await device(true);
 await add(phone.page,'One');await add(phone.page,'Two');
 await waitFor(async()=>(await remote(probe.request))?.applications?.length===2,'two phone applications saved to real Supabase');
 const desktop=await device(false);
 await waitFor(async()=>(await local(desktop.page)).length===2,'desktop automatically receives phone applications');
 await applications(desktop.page);
 assert.ok((await desktop.page.locator('body').innerText()).includes('CARVIO QA Fictional One'));
 await desktop.page.getByRole('combobox',{name:'Status for QA Engineer One',exact:true}).selectOption('Applied');
 await waitFor(async()=>(await remote(probe.request))?.applications?.find(a=>a.role==='QA Engineer One')?.status==='Applied','desktop status saved to real Supabase');
 await phone.page.bringToFront();
 await waitFor(async()=>(await local(phone.page)).find(a=>a.role==='QA Engineer One')?.status==='Applied','phone automatically receives desktop status without reload');
 assert.equal((await local(phone.page)).length,2);
 await phone.page.screenshot({path:`${output}/phone.png`,fullPage:true});
 await desktop.page.screenshot({path:`${output}/desktop.png`,fullPage:true});
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/report.json`,JSON.stringify({result:'passed',environment:'production with explicitly authorized dedicated QA account',physicalAndroidDevice:false,independentBrowserContexts:true,auth:'real Supabase email-confirmed session',workspaceApiMocked:false,analyticsSuppressed:true,applicationCount:2,checks,browserErrors:errors},null,2));
 console.log(JSON.stringify({result:'passed',applicationCount:2,checks},null,2));
}catch {
 console.error('Hosted acceptance failed; inspect the dedicated QA account. Credentials are not logged.');
 process.exitCode=1;
}finally{for(const c of contexts)await c.close();await browser.close();}
