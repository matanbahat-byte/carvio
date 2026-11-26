import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
if(process.env.CARVIO_REMOTE)launch.proxy={server:process.env.HTTPS_PROXY};
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const width of [390,1366]){
 const context=await browser.newContext({ignoreHTTPSErrors:Boolean(process.env.CARVIO_REMOTE),reducedMotion:"reduce",viewport:{width,height:844}}),page=await context.newPage();
 await context.addInitScript(()=>sessionStorage.setItem('carvio.language.v1',JSON.stringify('en')));
 await context.route('**/api/job-availability',r=>r.fulfill({json:{status:'unknown',reason:'unsupported',checkedAt:''}}));
 await page.goto(`${base}/?workspace=1&demo=1`);
 const entry=page.getByRole('button',{name:'Save a job from a link',exact:true});await entry.click();
 await page.keyboard.press('Control+k');await page.getByRole('heading',{name:'What do you want to do?',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),2);
 await page.keyboard.press('Escape');await page.getByRole('heading',{name:'What do you want to do?',exact:true}).waitFor({state:'hidden'});
 assert.equal(await page.getByRole('dialog').count(),1,'Escape must close only the top modal');assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
 await page.getByRole('dialog').getByRole('button',{name:'Close modal',exact:true}).click();assert.equal(await page.locator('.modal-overlay').count(),0);
 for(let i=0;i<3;i++){
  await entry.click({timeout:3000});let dialog=page.getByRole('dialog');await dialog.locator('input[type=url]').fill(`https://boards.greenhouse.io/qa/jobs/${987654320+i}`);await dialog.getByRole('button',{name:'Review details',exact:true}).click();
  await dialog.locator('#capture-role').fill('QA Role '+i);await dialog.locator('#capture-company').fill('QA Company');await dialog.getByRole('button',{name:'Save job',exact:true}).click();await page.getByRole('heading',{name:'Job saved',exact:true}).waitFor();
  if(i===0)await dialog.getByRole('button',{name:'Close modal',exact:true}).click();else if(i===1)await page.keyboard.press('Escape');else await dialog.getByRole('button',{name:'Back to overview',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.modal-overlay').length===0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await entry.click({timeout:3000});await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 }
 assert.equal(await page.locator('.modal-overlay').count(),0);console.log(`PASS modal ${width}: nested Escape preserves underlying modal/lock, three saves with button/Escape/overview close, immediate next click, no orphan overlay`);await context.close();
}}finally{await browser.close();}
