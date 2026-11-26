import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en'])for(const status of ['Considering','Applied']){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 const action=language==='he'?(status==='Considering'?'לבדוק התאמה לפני הגשה':'לשלוח תיק עבודות'):(status==='Considering'?'Review fit before applying':'Send portfolio');
 const due=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
 const records=[{id:'qa-primary',company:'QA Primary',role:'QA Role',status,priority:'Medium',nextStep:action,nextStepDue:due,lastActivityAt:new Date().toISOString()},{id:'qa-secondary',company:'QA Secondary',role:'QA Role',status,priority:'Medium',nextStep:action+' 2',nextStepDue:due,lastActivityAt:new Date().toISOString()}];
 await context.addInitScript(({language,records})=>{if(!sessionStorage.getItem('overdue-fixture')){sessionStorage.setItem('overdue-fixture','1');sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.applications.v1',JSON.stringify(records));}},{language,records});
 await page.goto(`${base}/?workspace=1&demo=1`);
 await page.locator('#dashboard-v2-today-title').filter({hasText:action}).waitFor();
 assert.equal(await page.locator('#dashboard-v2-today-title').innerText(),action);
 const secondaryBefore=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')).find(a=>a.id==='qa-secondary'));
 const secondary=page.locator('.dashboard-v2-attention-row').filter({hasText:'QA Secondary'});
 await secondary.waitFor();assert.equal(await secondary.locator('strong').innerText(),action+' 2');
 assert.doesNotMatch(await page.locator('.dashboard-v2-today-copy').innerText(),/follow.up|your .* application|הוגשה|הודעת המשך/i);
 await secondary.getByRole('button',{name:language==='he'?'פתיחת המשרה':'Open opportunity'}).click();
 await page.getByRole('dialog').waitFor();assert.match(await page.getByRole('dialog').innerText(),/QA Secondary/);await page.keyboard.press('Escape');
 await page.locator('.dashboard-v2-today-actions').getByRole('button',{name:language==='he'?'פתיחת המשרה':'Open opportunity'}).click();
 await page.getByRole('dialog').waitFor();assert.match(await page.getByRole('dialog').innerText(),/QA Primary/);await page.keyboard.press('Escape');
 await page.locator('.dashboard-v2-today-actions').getByRole('button',{name:language==='he'?'בוצע':'Done',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('heading',{name:language==='he'?'מעולה. מה הצעד הבא?':'Nice work. What comes next?'}).waitFor();
 assert.ok((await dialog.innerText()).includes(action));
 await dialog.getByRole('button',{name:language==='he'?'לא עכשיו':'Not now',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')).find(a=>a.id==='qa-primary').nextStep==='');
 const after=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')));
 assert.equal(after[0].status,status);assert.equal(after[0].nextStepDue,'');assert.deepEqual(after[1],secondaryBefore);
 await page.reload();await page.locator('#dashboard-v2-today-title').filter({hasText:action+' 2'}).waitFor();
 const persisted=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1')));
 assert.equal(persisted[0].nextStep,'');assert.equal(persisted[0].nextStepDue,'');assert.equal(persisted[0].status,status);
 console.log(`PASS overdue ${language} ${status}: actual primary/secondary actions, opportunity opens, Done/next-action dialog preserved, no automatic scheduling/status change, reload persistence`);await context.close();
}}finally{await browser.close();}
