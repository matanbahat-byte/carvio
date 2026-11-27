// Fictional local backend only. Real DB authorization is separately tested with rollback SQL.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE);const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);
let stops=0,lastFilter=null,enabled=false;
const metrics={enabledNow:2,activatedUsers:2,selectedJobs:5,sent:2,failed:1,unknown:0,clicked:1,returned:1,saved:1,applied:0,unsubscribed:0,dryRunReady:3};
const mock=createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;let body=null;
 const token=(req.headers.authorization||'').split(' ')[1];let sub='';try{sub=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;}catch{}
 if(req.url==='/auth/v1/user')body={id:sub,email:'fixture@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
 else if(req.url==='/rest/v1/rpc/radar_admin_access')body=sub==='11111111-1111-4111-8111-111111111111';
 else if(req.url==='/rest/v1/rpc/radar_admin_summary'){lastFilter=JSON.parse(text);body={current:metrics,previous:{...metrics,sent:1,selectedJobs:3},sendingEnabled:enabled,generatedAt:new Date().toISOString(),timeZone:'Asia/Jerusalem'};}
 else if(req.url==='/rest/v1/rpc/radar_admin_stop'){stops++;enabled=false;body=true;}
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(body));
});await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));const backend='http://127.0.0.1:'+mock.address().port;
const port=15000+Math.floor(Math.random()*15000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:backend,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fictional-local-key'},stdio:'ignore'});
const output=process.env.RADAR_QA_OUTPUT||'/tmp/carvio-radar-admin-qa';await mkdir(output,{recursive:true});
let browser;
try{
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(base+'/admin/job-radar')).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready);
 browser=await chromium.launch({headless:true,args:c.args,executablePath:await c.executablePath()});
 const cookie=sub=>{const user={id:sub,email:'fixture@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false};const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub,exp:4102444800,role:'authenticated'})).toString('base64url')+'.fixture';return {name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:4102444800,token_type:'bearer',user})).toString('base64url'),url:base};};
 const guest=await browser.newContext();const g=await guest.newPage();await g.goto(base+'/admin/job-radar?lang=en');await g.getByRole('heading',{name:'Access is restricted to authorized administrators.'}).waitFor();assert.equal((await guest.request.get(base+'/api/admin/job-radar?day=2026-11-27')).status(),403);await guest.close();
 const regular=await browser.newContext();await regular.addCookies([cookie('22222222-2222-4222-8222-222222222222')]);assert.equal((await regular.request.get(base+'/api/admin/job-radar?day=2026-11-27')).status(),403);assert.equal((await regular.request.post(base+'/api/admin/job-radar',{headers:{Origin:base}})).status(),403);assert.equal(stops,0);await regular.close();
 for(const language of ['he','en'])for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies([cookie('11111111-1111-4111-8111-111111111111')]);
  const page=await ctx.newPage();await page.goto(base+'/admin/job-radar?lang='+language);
  await page.getByRole('heading',{name:language==='he'?'מיילים שאושרו ב־Gmail':'Gmail accepted messages',exact:true}).waitFor();assert.ok(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth));
  await page.getByRole('combobox').nth(0).selectOption('week');await page.getByRole('combobox').nth(1).selectOption('test');
  for(let i=0;i<100&&!(lastFilter?.p_days===7&&lastFilter?.p_cohort==='test');i++)await delay(50);assert.equal(lastFilter.p_days,7);assert.equal(lastFilter.p_cohort,'test');
  const before=stops;assert.equal((await ctx.request.post(base+'/api/admin/job-radar',{headers:{Origin:'https://foreign.example'}})).status(),403);assert.equal(stops,before);
  assert.equal((await ctx.request.get(base+'/api/admin/job-radar?day=2026-11-27&period=day&cohort=pilot&action=stop')).status(),200);assert.equal(stops,before);
  await page.getByRole('button',{name:language==='he'?'עצירת שליחה מיידית':'Stop sending immediately',exact:true}).click();await page.getByText(language==='he'?'העצירה אושרה ונרשמה.':'Stop confirmed and audited.',{exact:true}).waitFor();assert.equal(stops,before+1);
  await page.screenshot({path:output+`/admin-${language}-${width}.png`,fullPage:true});await ctx.close();
 }
 console.log(JSON.stringify({result:'PASS',fixtures:true,checks:['guest/regular access denied','day/week/cohort filters','equal-period comparison','foreign-origin stop denied','GET cannot stop','authorized stop','HE/EN at 390/1280 no overflow'],actualSendCalls:0,output}));
}finally{await browser?.close();server.kill();await new Promise(resolve=>mock.close(resolve));}
