import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = new URL(process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3108').origin;
const browser = await chromium.launch({headless:true});
const results=[];
try {
for (const viewport of [{width:360,height:800},{width:390,height:844},{width:1440,height:900}]) {
 for (const language of ['he','en']) {
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${origin}/find?lang=${language}`);
  await page.locator('[name=q]').fill('Software Engineer');
  await page.locator('[name=country]').fill('Israel');
  await page.locator('[name=city]').fill('Tel Aviv');
  await Promise.all([page.waitForURL(url=>url.searchParams.get('q')==='Software Engineer'),page.locator('button[type=submit]').click()]);
  assert.equal(new URL(page.url()).searchParams.get('lang'),language);
  assert.equal(await page.locator('main').getAttribute('dir'),language==='he'?'rtl':'ltr');
  assert.equal(await page.locator('[data-search-provider]').count(),4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.locator('a[hreflang]').click();
  const switched=new URL(page.url());
  assert.equal(switched.searchParams.get('lang'),language==='he'?'en':'he');
  assert.equal(switched.searchParams.get('q'),'Software Engineer');
  assert.equal(await page.locator('[name=city]').inputValue(),'Tel Aviv');
  await page.reload();
  assert.equal(await page.locator('[name=q]').inputValue(),'Software Engineer');
  assert.equal(await page.locator('input[name=lang]').inputValue(),language==='he'?'en':'he');
  assert.deepEqual(errors,[]);
  results.push({viewport,language,result:'PASS'});
  await context.close();
 }
}
console.log(JSON.stringify(results));
} finally {await browser.close();}
