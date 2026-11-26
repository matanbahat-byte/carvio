import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
await mkdir('artifacts/capture-home',{recursive:true});
try{
for(const language of ['he','en'])for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(language=>{sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));},language);
 // Isolated ATS response, never a claim about an actual listing.
 await context.route('**/api/job-availability',async route=>route.fulfill({json:route.request().postDataJSON().url.includes('greenhouse.io')?{status:'published',reason:'listed',checkedAt:new Date().toISOString(),details:{role:'QA Fixture Engineer',company:'QA Fixture Company',location:'Tel Aviv'}}:{status:'unknown',reason:'unsupported',checkedAt:''}}));
 await page.goto(`${base}/?workspace=1&demo=1`);
 const entry=page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true});
 await entry.waitFor();
 const count=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')||'[]').length);
 const before=await count();
 const open=async url=>{await entry.click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:language==='he'?'קישור למשרה':'Job URL',exact:true}).fill(url);await dialog.getByRole('button',{name:language==='he'?'בדיקת הפרטים':'Review details',exact:true}).click();return dialog;};
 const url='https://boards.greenhouse.io/carvio-qa/jobs/123456789';
 let dialog=await open(url);await page.locator('#capture-role').waitFor();
 await page.waitForFunction(()=>document.getElementById('capture-role')?.value==='QA Fixture Engineer');
 assert.equal(await page.locator('#capture-company').inputValue(),'QA Fixture Company');
 assert.equal(await count(),before,'Review cannot save automatically');
 await page.locator('#capture-role').fill('QA Reviewed Engineer');
 await dialog.getByRole('button',{name:language==='he'?'שמירת המשרה':'Save job',exact:true}).click();
 await page.getByRole('heading',{name:language==='he'?'המשרה נשמרה':'Job saved',exact:true}).waitFor();
 assert.equal(await count(),before+1);await page.keyboard.press('Escape');
 dialog=await open(url);await page.getByRole('heading',{name:language==='he'?'המשרה נשמרה':'Job saved',exact:true}).waitFor();assert.equal(await count(),before+1,'Duplicate URL must reuse the record');await page.keyboard.press('Escape');
 dialog=await open('https://www.linkedin.com/jobs/view/999999999');
 await page.locator('#capture-role').waitFor();await page.locator('#capture-role').fill('QA Manual Role');await page.locator('#capture-company').fill('QA Manual Company');
 await dialog.getByRole('button',{name:language==='he'?'שמירת המשרה':'Save job',exact:true}).click();await page.getByRole('heading',{name:language==='he'?'המשרה נשמרה':'Job saved',exact:true}).waitFor();assert.equal(await count(),before+2);await page.keyboard.press('Escape');
 dialog=await open('https://www.linkedin.com/jobs/search/?keywords=Engineer');await dialog.getByRole('alert').waitFor();assert.equal(await count(),before+2);await page.keyboard.press('Escape');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`artifacts/capture-home/${language}-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);console.log(`PASS capture ${language} ${width}: direct home entry, review, edit, save, duplicate, manual fallback, invalid link`);
 await context.close();
}
}finally{await browser.close();}
