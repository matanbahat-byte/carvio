import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en'])for(const evidence of [true,false]){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 await context.addInitScript(({language,evidence})=>{if(!sessionStorage.getItem('prep-fixture')){sessionStorage.setItem('prep-fixture','1');sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.applications.v1',JSON.stringify([{id:'qa-prep',company:'QA Company',role:'QA Role',status:'Interview',requirements:'SQL\nPython',requirementEvidence:[{id:'r1',requirement:'SQL',evidence:evidence?'Saved real reporting example':''},{id:'r2',requirement:'Python',evidence:''}]}]));}},{language,evidence});
 await page.goto(`${base}/?workspace=1&demo=1`);
 const open=async()=>{await page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await page.locator('.command-palette input').fill('QA Role');await page.locator('.command-results').getByRole('button',{name:/QA Role/}).click();await page.getByRole('dialog').locator('details.workspace-more-context > summary').click();await page.getByRole('dialog').getByRole('button',{name:language==='he'?/^(פתיחת מרכז ההכנה|המשך הכנה)$/:/^(Open preparation workspace|Continue preparation)$/}).click();};
 await open();const fields=()=>page.getByRole('dialog').locator('.interview-preparation-grid textarea');
 assert.equal(await fields().nth(0).inputValue(),'');assert.match(await fields().nth(2).inputValue(),/SQL/);assert.match(await fields().nth(3).inputValue(),/Python/);
 if(evidence)assert.match(await fields().nth(1).inputValue(),/Saved real reporting example/);else assert.equal(await fields().nth(1).inputValue(),'');
 await fields().nth(1).fill('Manual STAR edit');await fields().nth(2).fill('');
 await page.getByRole('dialog').getByRole('button',{name:language==='he'?'שמירת ההכנה':'Save preparation',exact:true}).click();
 await page.getByRole('dialog').locator('details.workspace-more-context > summary').click();await page.getByRole('dialog').getByRole('button',{name:language==='he'?/^(פתיחת מרכז ההכנה|המשך הכנה)$/:/^(Open preparation workspace|Continue preparation)$/}).click();
 assert.equal(await fields().nth(1).inputValue(),'Manual STAR edit');assert.equal(await fields().nth(2).inputValue(),'');
 await page.reload();await open();assert.equal(await fields().nth(1).inputValue(),'Manual STAR edit');assert.equal(await fields().nth(2).inputValue(),'');
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.applications.v1'))[0]);assert.equal(saved.requirementEvidence[0].evidence,evidence?'Saved real reporting example':'');
 console.log(`PASS prep ${language} evidence=${evidence}: first open, saved real examples/gaps, no company invention, manual edits/cleared field preserved on reopen/reload`);await context.close();
}}finally{await browser.close();}
