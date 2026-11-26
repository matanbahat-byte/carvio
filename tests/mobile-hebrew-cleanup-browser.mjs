import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en']){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await context.addInitScript(language=>{if(!sessionStorage.getItem('cleanup-fixture')){sessionStorage.setItem('cleanup-fixture','1');sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.applications.v1',JSON.stringify([{id:'qa-existing',company:'QA Existing Company',role:'QA Existing Role',source:'Company careers',priority:'Medium',status:'Considering',jobUrl:'https://example.test/old-job'}]));}},language);
 await context.route('**/api/job-availability',r=>r.fulfill({json:{status:'unknown',reason:'unsupported',checkedAt:''}}));
 await page.goto(`${base}/?workspace=1&demo=1`);
 await page.getByText(language==='he'?'ההזדמנויות הבאות שלכם':'YOUR NEXT OPPORTUNITIES',{exact:true}).waitFor();
 await page.getByText(language==='he'?/^יש לכם משרה שמורה אחת\./:/^You have 1 saved opportunity\./).waitFor();
 const entry=page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true});
 const compact=(await entry.boundingBox()).y;
 const oldSpacing=await page.addStyleTag({content:'@media(max-width:767px){.carvio-workspace-language{margin-bottom:.75rem!important}.carvio-public-search-shortcut{margin-bottom:.75rem!important}}'});
 const previous=(await entry.boundingBox()).y;assert.ok(previous-compact>=19,'Capture should appear at least 19px earlier');await oldSpacing.evaluate(e=>e.remove());
 for(const control of [page.locator('.carvio-language-switch'),page.locator('.carvio-public-search-shortcut')]){const b=await control.boundingBox();assert.ok(b.height>=44&&b.x>=0&&b.x+b.width<=390);}
 const records=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')));
 const original=(await records())[0];
 for(const [suffix,custom] of [['987654321',false],['987654322',true]]){
  await entry.click();const dialog=page.getByRole('dialog');await dialog.locator('input[type=url]').fill(`https://boards.greenhouse.io/qa/jobs/${suffix}`);await dialog.getByRole('button',{name:language==='he'?'בדיקת הפרטים':'Review details',exact:true}).click();
  const source=dialog.locator('input[list=capture-source-options]');await source.waitFor();assert.equal(await source.inputValue(),language==='he'?'אתר החברה':'Company careers');
  if(custom){await source.fill('QA custom source');assert.equal(await source.inputValue(),'QA custom source');}
  await dialog.locator('#capture-role').fill(`QA New Role ${suffix}`);await dialog.locator('#capture-company').fill('QA New Company');
  const b=await source.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390);
  await dialog.getByRole('button',{name:language==='he'?'שמירת המשרה':'Save job',exact:true}).click();await page.getByRole('heading',{name:language==='he'?'המשרה נשמרה':'Job saved',exact:true}).waitFor();
  const saved=(await records()).find(a=>a.role===`QA New Role ${suffix}`);assert.equal(saved.source,custom?'QA custom source':'Company careers');
  assert.deepEqual((await records()).find(a=>a.id==='qa-existing'),original);await page.keyboard.press('Escape');
  if(!custom)await page.getByText(language==='he'?/^יש לכם 2 משרות שמורות\./:/^You have 2 saved opportunities\./).waitFor();
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log(`PASS cleanup ${language} 390: translated banner/source, editable custom source, canonical preservation, singular/plural, ${previous-compact}px saved, touch targets/no clipping`);await context.close();
}}finally{await browser.close();}
