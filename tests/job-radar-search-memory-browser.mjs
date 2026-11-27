// Fictional authenticated account and RPC responses only. No real mail or account changes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
const port=18000+Math.floor(Math.random()*10000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/find')).ok)break;}catch{}await delay(100);}
 let launch={headless:true,args:['--no-sandbox'],...(process.env.CARVIO_CHROMIUM_PATH?{executablePath:process.env.CARVIO_CHROMIUM_PATH}:{})};
 if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={headless:true,args:c.args,executablePath:await c.executablePath()};}
 browser=await chromium.launch(launch);
 const uid='11111111-1111-4111-8111-111111111111';
 const user={id:uid,email:'fixture@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',is_anonymous:false,app_metadata:{provider:'email'},user_metadata:{},aud:'authenticated',role:'authenticated'};
 for(const lang of ['he','en'])for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900}});
  const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:4102444800,role:'authenticated'})).toString('base64url')+'.fixture';
  await ctx.addCookies([{name:'sb-pzykndfxenwqnpvrbkby-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:4102444800,expires_in:3600,token_type:'bearer',user})).toString('base64url'),url:base}]);
  let prefs={enabled:true,preferences:{role:'Old role',country:'Israel',city:'',workModel:'',seniority:'',employmentType:''},frequency_per_week:2,updated_at:'2026-01-01T00:00:00Z',search_updated_at:null};
  let updates=0,consentMutations=0;
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await ctx.route('https://pzykndfxenwqnpvrbkby.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;let body=null;
   if(path==='/auth/v1/user')body=user;
   else if(path.endsWith('/product_events'))body=null;
   else if(path.endsWith('/job_radar_preferences'))body=prefs;
   else if(path.endsWith('/get_job_radar_workspace'))body={runtimeEnabled:false,jobs:[]};
   else if(path.endsWith('/update_job_radar_search')){const p=req.postDataJSON();updates++;assert.equal(p.p_expected_version,prefs.updated_at);assert.equal(prefs.enabled,true);prefs={...prefs,preferences:p.p_preferences,updated_at:new Date().toISOString(),search_updated_at:p.p_searched_at};body={updated:true,preferences:prefs.preferences,updated_at:prefs.updated_at};}
   else if(path.endsWith('/save_job_radar_preferences')){consentMutations++;const p=req.postDataJSON();assert.equal(p.p_enabled,false);prefs={...prefs,enabled:false,updated_at:new Date().toISOString()};}
   else throw Error('Unexpected fixture route '+path);
   await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(body)});
  });
  const page=await ctx.newPage();const search=()=>base+'/find?'+new URLSearchParams({lang,q:'vphr',country:'Israel',city:'Tel Aviv',searchedAt:new Date().toISOString()});
  await page.goto(search());
  await page.getByText(lang==='he'?'החיפוש נשמר. המשרות במייל ייבחרו לפי הפרמטרים האלה.':'Search saved. Email job matches will use these criteria.',{exact:true}).waitFor();
  assert.equal(updates,1);assert.equal(consentMutations,0);assert.equal(prefs.frequency_per_week,2);assert.equal(prefs.preferences.role,'VP HR');assert.equal(prefs.preferences.city,'Tel Aviv');
  const link=await page.locator('[data-search-provider="linkedin"]').getAttribute('href');assert.match(new URL(link).searchParams.get('keywords'),/"VP HR"/);assert.ok(!new URL(link).searchParams.get('keywords').includes('vphr'));
  await page.reload();await page.getByRole('button',{name:lang==='he'?'השהיה / הפסקת התראות':'Pause / stop alerts',exact:true}).waitFor();
  assert.equal(updates,1);assert.equal(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:lang==='he'?'השהיה / הפסקת התראות':'Pause / stop alerts',exact:true}).click();
  await page.getByText(lang==='he'?'ההתראות הופסקו.':'Alerts stopped.',{exact:true}).waitFor();
  await page.goto(search());await page.getByRole('button',{name:lang==='he'?'Job Radar · ניהול התראות משרות':'Job Radar · Manage job alerts',exact:true}).waitFor();
  assert.equal(prefs.enabled,false);assert.equal(updates,1);assert.equal(consentMutations,1);
  await ctx.close();
  console.log(`PASS ${lang} ${width}px: saved search sync, canonical VP HR query, no consent mutation, refresh persistence, paused stays paused`);
 }
}finally{await browser?.close();server.kill();}
