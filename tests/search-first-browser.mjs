// Fictional auth/backend responses only; no real email or account creation.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE);const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);
const port=16000+Math.floor(Math.random()*10000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/find',{signal:AbortSignal.timeout(2000)})).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true,args:c.args,executablePath:await c.executablePath()});
 for(const language of ['he','en'])for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addInitScript(lang=>{localStorage.setItem('carvio.language.v1',JSON.stringify(lang));if(!localStorage.getItem('carvio.search-profile.v1'))localStorage.setItem('carvio.search-profile.v1',JSON.stringify({role:'HR Manager',country:'Israel',location:'Tel Aviv'}));},language);let otp=0;
  const uid='11111111-1111-4111-8111-111111111111',user={id:uid,email:'fixture@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
  await ctx.route('https://pzykndfxenwqnpvrbkby.supabase.co/**',async route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/otp'))otp++;const body=url.pathname==='/auth/v1/user'?user:url.pathname.endsWith('/user_workspaces')?null:[];await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
  await ctx.route('**/api/job-availability**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"status":"unknown"}'}));
  const page=await ctx.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:language==='he'?'כניסה לחשבון קיים':'Sign in to an existing account',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/Continue with Google|המשך באמצעות Google/}).count(),0);
  await page.getByRole('link',{name:/Explore the new job search|חיפוש משרות חדש/}).click();await page.waitForURL('**/find?**');assert.equal(otp,0);
  await page.goto(base+'/?workspace=1');await page.getByRole('button',{name:/Save a job from a link|שמירת משרה מקישור|Paste a job link|הדבקת קישור למשרה/}).first().click();
  let dialog=page.getByRole('dialog');await dialog.waitFor();const urlInput=dialog.locator('input').first();await urlInput.fill('https://boards.greenhouse.io/fixture/jobs/123');await dialog.getByRole('button',{name:/Review details|בדיקת הפרטים/,exact:true}).click();
  await dialog.locator('#capture-role').fill('Fixture HR Manager');await dialog.locator('#capture-company').fill('Fixture company');await dialog.getByLabel(/Next action|הפעולה הבאה/).fill('Review job details');await dialog.locator('input[type="datetime-local"]').fill('2026-12-01T10:00');
  await dialog.getByRole('button',{name:/^Save job$|^שמירת המשרה$/}).click();const invite=page.getByRole('region',{name:/Save and return from any device|שמירה וחזרה מכל מכשיר/});await invite.waitFor();
  assert.equal(otp,0);await invite.getByRole('button',{name:/secure email link|או קישור כניסה במייל/}).click();await invite.getByRole('textbox',{name:/Email address|כתובת מייל/}).fill('fixture@example.test');await invite.getByRole('button',{name:/^Send link$|^שליחת קישור$/}).click();
  await invite.getByText(/Check your inbox and spam folder|בדקו את תיבת הדואר וגם את תיקיית הספאם/).waitFor();assert.equal(otp,1);
  const searchBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.search-profile.v1')));
  const marker=await page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.auth-return.v1')));assert.ok(marker.applicationId);assert.equal(marker.language,language);const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.applications.v1')));assert.equal(before.length,1);
  const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:4102444800,role:'authenticated'})).toString('base64url')+'.fixture';await ctx.addCookies([{name:'sb-pzykndfxenwqnpvrbkby-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:4102444800,token_type:'bearer',user})).toString('base64url'),url:base}]);
  await page.goto(base+'/?workspace=1&cloud=connected');for(let i=0;i<100;i++){if(await page.evaluate(()=>localStorage.getItem('carvio.auth-return.v1')===null))break;await delay(100);}
  assert.equal(await page.evaluate(()=>localStorage.getItem('carvio.auth-return.v1')),null);assert.ok((await page.locator('body').innerText()).includes('Fixture HR Manager'));const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.applications.v1')));assert.equal(after.length,1);assert.equal(after[0].id,marker.applicationId);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.search-profile.v1')).role),searchBefore.role);await ctx.close();
 }
 console.log('PASS HE/EN, mobile/desktop: search before sign-in, first save optional invitation, persisted job before mocked OTP, same-job return after simulated auth without duplication; zero actual emails.');
}finally{await browser?.close();server.kill();}
