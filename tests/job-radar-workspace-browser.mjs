// Browser QA uses fictional mocked account/history, not real accounts or mail APIs.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE);const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);
const port=15000+Math.floor(Math.random()*15000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});
for(let i=0;i<150;i++){try{if((await fetch(base+'/find')).ok)break;}catch{}await delay(100);}
const browser=await chromium.launch({headless:true,args:c.args,executablePath:await c.executablePath()});
const uid='11111111-1111-4111-8111-111111111111';const user={id:uid,email:'fixture@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false,app_metadata:{provider:'email'},user_metadata:{},aud:'authenticated',role:'authenticated'};
const output=process.env.RADAR_QA_OUTPUT||'/tmp/carvio-radar-workspace-qa';await mkdir(output,{recursive:true});
try{for(const language of ['he','en'])for(const width of [390,1280]){
 const ctx=await browser.newContext({viewport:{width,height:900}});const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:4102444800,role:'authenticated'})).toString('base64url')+'.fixture';
 await ctx.addCookies([{name:'sb-pzykndfxenwqnpvrbkby-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:4102444800,expires_in:3600,token_type:'bearer',user})).toString('base64url'),url:base}]);
 let prefs={enabled:true,preferences:{role:'Recruitment Manager',country:'Israel',city:'Tel Aviv',workModel:'',seniority:'',employmentType:''},frequency_per_week:3};let mutations=0;
 await ctx.route('https://pzykndfxenwqnpvrbkby.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let body=[];
  if(url.pathname==='/auth/v1/user')body=user;
  else if(url.pathname.endsWith('/job_radar_preferences'))body=prefs;
  else if(url.pathname.endsWith('/get_job_radar_workspace'))body={runtimeEnabled:false,jobs:[{id:'a'.repeat(64),title:'Fixture HR Director',company:'Fixture company',location:'Tel Aviv, Israel',source_url:'https://boards.greenhouse.io/fixture/jobs/123',provider:'greenhouse',is_active:true,sent_at:'2026-11-27T07:00:00Z',expires_at:'2099-01-01T00:00:00Z'}]};
  else if(url.pathname.endsWith('/save_job_radar_preferences')){const p=req.postDataJSON();mutations++;prefs=p.p_enabled?{enabled:true,preferences:p.p_preferences,frequency_per_week:p.p_frequency}:{...prefs,enabled:false};body=null;}
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(body)});
 });
 const page=await ctx.newPage();await page.goto(base+'/radar/preferences?lang='+language);
 await page.getByRole('heading',{name:'Fixture HR Director'}).waitFor({timeout:20000}).catch(async e=>{console.log((await page.locator('body').innerText()).slice(0,2000));throw e;});
 assert.equal(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth),true);
 const role=page.getByLabel(language==='he'?'תפקיד':'Role',{exact:true});await role.fill('Supply Chain Manager');await page.getByLabel(language==='he'?'כמה פעמים בשבוע?':'How often?').selectOption('2');
 await page.getByRole('button',{name:language==='he'?'הפעלה ושמירה':'Enable and save',exact:true}).click();
 await page.getByText(language==='he'?'ההעדפות נשמרו. מצב המנגנון מוצג למעלה.':'Preferences saved. The current mechanism status is shown above.',{exact:true}).waitFor();assert.equal(prefs.frequency_per_week,2);assert.equal(prefs.preferences.role,'Supply Chain Manager');
 await page.getByRole('button',{name:language==='he'?'Job Radar · ניהול התראות משרות':'Job Radar · Manage job alerts',exact:true}).click();await role.fill('Discarded change');
 await page.getByRole('button',{name:language==='he'?'סגירה':'Close',exact:true}).click();await page.getByRole('button',{name:language==='he'?'Job Radar · ניהול התראות משרות':'Job Radar · Manage job alerts',exact:true}).click();assert.equal(await role.inputValue(),'Supply Chain Manager');
 await page.getByRole('button',{name:language==='he'?'השהיה / הפסקת התראות':'Pause / stop alerts',exact:true}).click();assert.equal(prefs.enabled,false);assert.equal(prefs.frequency_per_week,2);assert.equal(mutations,2);
 await page.screenshot({path:output+`/radar-${language}-${width}.png`,fullPage:true});await page.goto(base+'/?workspace=1&findLang='+language);
 await page.getByRole('heading',{name:'Fixture HR Director',exact:true}).waitFor({timeout:20000});
 await page.getByRole('button',{name:/שמירה או ניהול מועמדות|Save or manage application/}).click().catch(async e=>{console.log((await page.locator('body').innerText()).slice(0,2200));throw e;});
 await page.getByRole('dialog').waitFor();assert.ok(await page.getByRole('dialog').locator('input').evaluateAll(inputs=>inputs.some(input=>input.value==='Fixture HR Director')));
 await ctx.close();
 }
 console.log(JSON.stringify({result:'PASS',fixtures:true,languages:['he','en'],widths:[390,1280],checks:['load sent history','no horizontal overflow','edit and save','cancel restores saved criteria','pause retains criteria','workspace reuses existing capture review'],actualSendCalls:0,output}));
}finally{await browser.close();server.kill();}
