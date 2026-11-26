import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en'])for(const partial of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await context.addInitScript(language=>sessionStorage.setItem('carvio.language.v1',JSON.stringify(language)),language);
 const description=partial?'About us\nWe create a better future.':'About us\nOur introduction.\nRequirements\n3 years of experience\nSQL\nAdditional information\nOur benefits.';
 await context.route('**/api/job-availability',r=>r.fulfill({json:{status:'published',reason:'listed',checkedAt:new Date().toISOString(),details:{role:'QA Verified Role',company:partial?'':'Source Company',location:'Tel Aviv',jobDescription:description,descriptionStatus:partial?'partial':'available'}}}));
 await page.goto(`${base}/?workspace=1&demo=1`);
 await page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.locator('input[type=url]').fill('https://jobs.lever.co/example/12345678-abcd-abcd-abcd-123456789012');
 await dialog.getByRole('button',{name:language==='he'?'בדיקת הפרטים':'Review details',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#capture-role')?.value==='QA Verified Role');
 if(partial){await dialog.getByText(language==='he'?/ייתכן שהתיאור חלקי/:/The description may be partial/).waitFor();assert.equal(await dialog.locator('#capture-company').inputValue(),'');await dialog.locator('#capture-company').fill('Manually confirmed company');}
 else assert.equal(await dialog.locator('#capture-company').inputValue(),'Source Company');
 await dialog.getByRole('button',{name:language==='he'?'שמירת המשרה':'Save job',exact:true}).click();
 await page.getByRole('heading',{name:language==='he'?'המשרה נשמרה':'Job saved',exact:true}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')).find(a=>a.role==='QA Verified Role'));
 assert.equal(saved.jobDescription,description);assert.equal(saved.requirementEvidence.length,partial?0:2);assert.equal(saved.company,partial?'Manually confirmed company':'Source Company');
 console.log(`PASS ATS ${language} partial=${partial}: complete description persisted, source company/manual fallback, requirements and partial warning`);await context.close();
}}finally{await browser.close();}
