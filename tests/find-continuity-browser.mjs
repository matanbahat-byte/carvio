import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const lang of ['he','en']){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 const role=lang==='he'?'מנהל משאבי אנוש':'Software Engineer';
 await page.goto(`${base}/find?lang=${lang}`);
 await page.locator('input[name=q]').fill(role);await page.locator('input[name=country]').fill(lang==='he'?'ישראל':'Israel');await page.locator('input[name=city]').fill(lang==='he'?'תל אביב':'Tel Aviv');
 await Promise.all([page.waitForURL(u=>u.hash==='#search-sources'),page.locator('form button[type=submit]').click()]);
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('carvio.search-profile.v1')));
 const saved=await read();assert.equal(saved.role,role);assert.equal(saved.country,'Israel');assert.equal(saved.location,'Tel Aviv');assert.ok(Number.isFinite(Date.parse(saved.lastSearchedAt)));
 assert.equal(new URL(page.url()).searchParams.get('searchedAt'),saved.lastSearchedAt);
 await page.reload();assert.deepEqual(await read(),saved);
 await page.getByRole('link',{name:lang==='he'?'המשך לסביבת העבודה':'Continue to workspace',exact:true}).click();
 await page.locator('input[list=carvio-role-options]').waitFor();assert.equal(await page.locator('input[list=carvio-role-options]').inputValue(),role);
 assert.equal((await read()).lastSearchedAt,saved.lastSearchedAt);
 await page.getByRole('link',{name:lang==='he'?'שינוי חיפוש':'Edit search',exact:true}).click();
 await page.waitForURL('**/find?*');
 for(const [key,value] of [['q',role],['country','Israel'],['city','Tel Aviv']])assert.equal(await page.locator(`input[name=${key}]`).inputValue(),value);
 assert.equal(new URL(page.url()).searchParams.get('searchedAt'),saved.lastSearchedAt);
 await page.reload();assert.equal(await page.locator('input[name=q]').inputValue(),role);assert.equal((await read()).lastSearchedAt,saved.lastSearchedAt);
 // A public visitor must not overwrite preferences belonging to an authenticated account.
 await page.evaluate(()=>localStorage.setItem('carvio.cloud-local-owner.v1','qa-other-owner'));
 await page.locator('input[name=q]').fill('Different Role');await Promise.all([page.waitForURL(u=>u.searchParams.get('q')==='Different Role'),page.locator('form button[type=submit]').click()]);
 assert.equal((await read()).role,role);
 console.log(`PASS continuity ${lang}: anonymous mobile round trip/reload, canonical shared profile, timestamp preserved, owned workspace protected`);await context.close();
}}finally{await browser.close();}
