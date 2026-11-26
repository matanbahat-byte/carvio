import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const width of [390,1366])for(const lang of ['he','en']){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();
 const resume=()=>page.getByRole('button',{name:lang==='he'?/המשך החיפוש האחרון/:/Continue your last search/});
 const role=lang==='he'?'מנהל משאבי אנוש':'Software Engineer';
 const read=()=>page.evaluate(()=>localStorage.getItem('carvio.search-profile.v1'));
 await page.goto(`${base}/find?lang=${lang}`);await page.locator('form[data-find-search]').waitFor();assert.equal(await resume().count(),0);assert.equal(await read(),null);
 for(const [key,value] of [['q',role],['country','Israel'],['city','Tel Aviv']])await page.locator(`input[name=${key}]`).fill(value);
 await Promise.all([page.waitForURL(u=>u.hash==='#search-sources'),page.locator('form button[type=submit]').click()]);
 const links=()=>page.locator('[data-search-provider]').evaluateAll(es=>es.map(e=>e.href));
 const originalLinks=await links(),saved=await read();
 await page.goto(`${base}/find?lang=${lang}`);await resume().waitFor();await page.reload();await resume().waitFor();
 assert.ok((await resume().innerText()).includes(role));assert.ok((await resume().innerText()).includes('Tel Aviv'));assert.equal(await read(),saved);
 await Promise.all([page.waitForURL(u=>u.hash==='#search-sources'),resume().click()]);
 for(const [key,value] of [['q',role],['country','Israel'],['city','Tel Aviv']])assert.equal(await page.locator(`input[name=${key}]`).inputValue(),value);
 await page.locator('#search-sources').waitFor();assert.deepEqual(await links(),originalLinks);assert.equal(await resume().count(),0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const query of ['q=Product+Manager&country=Germany&city=Berlin','country=Germany','q=']){
  await page.goto(`${base}/find?lang=${lang}&${query}`);await page.locator('form[data-find-search]').waitFor();assert.equal(await resume().count(),0);
  const params=new URLSearchParams(query);for(const [key,value]of params)assert.equal(await page.locator(`input[name=${key}]`).inputValue(),value);
 }
 const current=await read();
 await page.evaluate(()=>localStorage.setItem('carvio.cloud-local-owner.v1','qa-other-account'));await page.goto(`${base}/find?lang=${lang}`);await page.locator('form[data-find-search]').waitFor();assert.equal(await resume().count(),0);assert.equal(await read(),current);
 await page.evaluate(()=>{localStorage.removeItem('carvio.cloud-local-owner.v1');localStorage.setItem('carvio.search-profile.v1','{invalid');});await page.reload();await page.locator('form[data-find-search]').waitFor();assert.equal(await resume().count(),0);
 console.log(`PASS find resume ${lang} ${width}: new visitor, returning/reload, criteria and source links preserved, explicit/partial/empty URL precedence, owner isolation and malformed storage`);await context.close();
}}finally{await browser.close();}
