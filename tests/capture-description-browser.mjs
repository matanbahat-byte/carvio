import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en']){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await context.addInitScript(language=>{sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));},language);
 await context.route('**/api/job-availability',r=>r.fulfill({json:{status:'unknown',reason:'unsupported',checkedAt:''}}));
 await page.goto(`${base}/?workspace=1&demo=1`);
 await page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.locator('input[type=url]').fill('https://boards.greenhouse.io/qa/jobs/987654321');
 await dialog.locator('details.smart-capture-optional summary').click();const text=dialog.locator('textarea');
 await text.fill('We are excited to welcome you to our growing global family.');
 await dialog.getByText(language==='he'?/אין מספיק מידע לזיהוי דרישות ברורות/:/Not enough information to identify clear requirements/).waitFor();
 const html=language==='he'?'&lt;h2&gt;דרישות&lt;/h2&gt;&lt;li&gt;ניסיון בניהול מלאי&lt;/li&gt;&lt;li&gt;אנגלית חובה&lt;/li&gt;':'&lt;h2&gt;Requirements&lt;/h2&gt;&lt;li&gt;3 years of experience&lt;/li&gt;&lt;li&gt;SQL&lt;/li&gt;';
 await text.fill(html+'<script>const required = "fake";</script>');
 assert.match(await dialog.locator('.smart-capture-detection').innerText(),/2/);
 await dialog.getByRole('button',{name:language==='he'?'בדיקת הפרטים':'Review details',exact:true}).click();
 await dialog.locator('#capture-role').fill('QA Role');await dialog.locator('#capture-company').fill('QA Company');
 await dialog.locator('details summary').filter({hasText:language==='he'?'תצוגה מקדימה של התיאור':'Preview description'}).click();
 const expected=language==='he'?'דרישות\nניסיון בניהול מלאי\nאנגלית חובה':'Requirements\n3 years of experience\nSQL';
 assert.ok((await dialog.innerText()).includes(expected));assert.doesNotMatch(await dialog.innerText(),/&lt;|<script>|const required/);
 await dialog.getByRole('button',{name:language==='he'?'שמירת המשרה':'Save job',exact:true}).click();
 await page.getByRole('heading',{name:language==='he'?'המשרה נשמרה':'Job saved',exact:true}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')).find(a=>a.role==='QA Role'));
 assert.equal(saved.jobDescription,expected);assert.equal(saved.requirementEvidence.length,2);assert.doesNotMatch(saved.requirements,/fake|<|>/);
 console.log(`PASS description ${language} 390: insufficient-content warning, encoded HTML cleanup, genuine requirements, saved plain text and no scripts`);await context.close();
}}finally{await browser.close();}
