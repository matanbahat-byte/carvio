import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en'])for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
 await context.addInitScript(language=>{if(!sessionStorage.getItem('labels-fixture')){sessionStorage.setItem('labels-fixture','1');sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.applications.v1',JSON.stringify([{id:'qa-labels',company:'QA Existing Company',role:'QA Existing Role',source:'Company careers',priority:'Medium',status:'Considering',jobUrl:'https://boards.greenhouse.io/qa/jobs/123456'}]));sessionStorage.setItem('carvio.search-profile.v1',JSON.stringify({role:'Software Engineer',country:'Israel',location:'Tel Aviv'}));}},language);
 await page.goto(`${base}/?workspace=1&demo=1`);
 const nav=page.locator(width<768?'.calm-mobile-nav button':'.calm-desktop-nav .calm-nav-button');
 await nav.nth(1).click();await page.getByRole('button',{name:width<768?(language==='he'?'פתיחת המועמדות':'Open application'):(language==='he'?'פתיחה':'Open'),exact:true}).first().click();
 const snapshot=page.locator('.workspace-snapshot');await snapshot.waitFor();const text=await snapshot.innerText();
 assert.ok(text.includes(language==='he'?'בינונית':'Medium'));assert.ok(text.includes(language==='he'?'אתר החברה':'Company careers'));
 const original=await page.evaluate(()=>{const a=JSON.parse(sessionStorage.getItem('carvio.applications.v1'))[0];return {source:a.source,priority:a.priority,jobUrl:a.jobUrl};});
 assert.equal(original.source,'Company careers');assert.equal(original.priority,'Medium');
 await page.keyboard.press('Escape');await nav.nth(2).click();
 const countries=page.getByRole('combobox',{name:language==='he'?'מדינה':'Country',exact:true});
 assert.equal(await countries.inputValue(),'Israel');assert.equal(await countries.locator('option[value=Israel]').innerText(),language==='he'?'ישראל':'Israel');assert.equal(await countries.locator('option[value="United States"]').innerText(),language==='he'?'ארצות הברית':'United States');
 const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carvio.search-profile.v1')));assert.equal(stored.country,'Israel');assert.equal(stored.location,'Tel Aviv');
 assert.deepEqual(await page.evaluate(()=>{const a=JSON.parse(sessionStorage.getItem('carvio.applications.v1'))[0];return {source:a.source,priority:a.priority,jobUrl:a.jobUrl};}),original);
 await page.goto(`${base}/find?lang=${language}`);assert.ok((await page.locator('form').locator('..').innerText()).includes(language==='he'?'הצעד הבא בקריירה':'FIND YOUR NEXT MOVE'));
 console.log(`PASS labels ${language} ${width}: existing job source/priority, country label/value, /find banner; stored values intact`);await context.close();
}}finally{await browser.close();}
