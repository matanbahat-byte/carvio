import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.CARVIO_PLAYWRIGHT_MODULE || 'playwright');
let launch = { headless: true };
if (process.env.CARVIO_CHROMIUM_PACKAGE) {
 const { default: binary } = await import(process.env.CARVIO_CHROMIUM_PACKAGE);
 launch = { ...launch, args: binary.args, executablePath: await binary.executablePath() };
}
const browser = await chromium.launch(launch);
const base = process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3120';
await mkdir('artifacts/handoff', {recursive:true});
try {
 for (const lang of ['he','en']) for (const width of [390,1440]) {
  const context = await browser.newContext({viewport:{width,height:900}});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  const role=lang==='he'?'מנהל מוצר':'Product Manager';
  await page.goto(`${base}/find?${new URLSearchParams({lang,q:role,country:lang==='he'?'ישראל':'Israel',city:lang==='he'?'תל אביב':'Tel Aviv'})}`);
  const link=page.getByRole('link',{name:lang==='he'?'למרכז ניהול הקריירה':'Career workspace'});
  const href=await link.getAttribute('href');
  assert.equal(new URL(href,base).searchParams.get('findLang'),lang);
  // Isolated demo storage avoids any live authentication or user data.
  await page.evaluate(()=>sessionStorage.setItem('carvio.language.v1','"en"'));
  await page.goto(`${base}${href}&demo=1`);
  await page.locator('input[list=carvio-role-options]').waitFor({timeout:10000}).catch(async error=>{console.log(await page.locator('body').innerText());console.log('URL',page.url(), 'ERRORS',errors);throw error;});
  assert.equal(await page.locator('input[list=carvio-role-options]').inputValue(),role);
  assert.equal(await page.getByRole('combobox',{name:lang==='he'?'מדינה':'Country',exact:true}).inputValue(),'Israel');
  assert.equal(await page.locator('input[list=carvio-city-options]').inputValue(),'Tel Aviv');
  await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('carvio.search-profile.v1')||'{}').country==='Israel');
  assert.equal(new URL(page.url()).searchParams.has('findRole'),false);
  const stored=await page.evaluate(()=>({profile:JSON.parse(sessionStorage.getItem('carvio.search-profile.v1')),language:JSON.parse(sessionStorage.getItem('carvio.language.v1'))}));
  assert.equal(stored.language,lang); assert.equal(stored.profile.role,role);
  assert.equal(stored.profile.employmentType,''); assert.equal(stored.profile.datePosted,'Any time');
  await page.screenshot({path:`artifacts/handoff/${lang}-${width}.png`,fullPage:true});
  await page.reload();
  await page.waitForFunction(role=>JSON.parse(sessionStorage.getItem('carvio.search-profile.v1')||'{}').role===role,role);
  assert.deepEqual(errors,[]); console.log(`PASS ${lang} ${width}: criteria, language, clean URL, persistence`);
  await context.close();
 }
} finally { await browser.close(); }
