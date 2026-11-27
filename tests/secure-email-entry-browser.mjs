// Local browser regression with fictional mocked auth responses; never sends real email.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE);const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);
const port=16000+Math.floor(Math.random()*10000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/find',{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,'Server ready');
 browser=await chromium.launch({headless:true,args:c.args,executablePath:await c.executablePath()});let simulatedOtpCalls=0,simulatedGoogleNavigations=0;
 for(const language of ['he','en'])for(const [width,height] of [[390,844],[390,600],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},...(height===600?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.0]'}:{})});
  await context.addInitScript(language=>localStorage.setItem('carvio.language.v1',JSON.stringify(language)),language);
  const page=await context.newPage();
  await page.route('**/auth/v1/otp**',async route=>{simulatedOtpCalls++;assert.equal(route.request().postDataJSON().email,'fixture@example.test');await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
  await page.route('**/auth/v1/authorize**',async route=>{simulatedGoogleNavigations++;assert.equal(new URL(route.request().url()).searchParams.get('provider'),'google');await route.fulfill({status:200,contentType:'text/html',body:'<h1>Fictional Google authorization</h1>'});});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Sign in to an existing account|כניסה לחשבון קיים/}).click();
  const toggle=page.getByRole('button',{name:/secure email link|או קישור כניסה במייל/});await toggle.click();
  const input=page.getByRole('textbox',{name:/Email address|כתובת מייל/});await input.waitFor();assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  let box=await input.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height,JSON.stringify({message:'Email field revealed in viewport',language,width,height,box}));
  await toggle.click();await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await input.isVisible(),true);assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  await input.fill('fixture@example.test');await page.getByRole('button',{name:/^Send link$|^שליחת קישור$/}).click();
  await page.getByText(/Check your inbox and spam folder|בדקו את תיבת הדואר וגם את תיקיית הספאם/).waitFor();assert.equal(new URL(page.url()).origin,base);
  assert.ok(await page.getByRole('button',{name:/Resend in|שליחה חוזרת בעוד/}).isDisabled());
  await page.getByRole('button',{name:/Continue with Google|המשך באמצעות Google/}).click();await page.getByRole('heading',{name:'Fictional Google authorization'}).waitFor();
  await context.close();
 }
 assert.equal(simulatedOtpCalls,6);assert.equal(simulatedGoogleNavigations,6);
 console.log(JSON.stringify({result:'PASS',fictionalResponses:true,scenarios:6,checks:['HE/EN','mobile and short in-app-size viewport','desktop','focus and reveal email input','repeated taps cannot close form','OTP success and resend feedback','Google authorization preserved'],actualEmailsSent:0}));
}finally{await browser?.close();server.kill();}
