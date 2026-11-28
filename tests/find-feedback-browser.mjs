import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{
for(const lang of ['he','en'])for(const width of [360,390]){
 const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/find?lang=${lang}`);
 assert.equal(await page.locator('#search-sources').count(),0);
 const role=lang==='he'?'מהנדס תוכנה':'Software Engineer',country=lang==='he'?'ישראל':'Israel',city=lang==='he'?'תל אביב':'Tel Aviv';
 await page.locator('input[name=q]').fill(role);await page.locator('input[name=country]').fill(country);await page.locator('input[name=city]').fill(city);
 const submit=async query=>Promise.all([page.waitForURL(u=>u.searchParams.get('q')===query&&u.hash==='#search-sources'),page.locator('form[data-find-search] button[type=submit]').click()]);
 await submit(role);
 const status=page.locator('#search-sources [role=status]');
 assert.equal(await status.innerText(),lang==='he'?'קישורי החיפוש החיצוניים מוכנים.':'Your external search links are ready.');
 const first=page.locator('#search-sources a[data-search-provider]').first();await first.waitFor();
 const box=await first.boundingBox();assert.ok(box&&box.y>=0&&box.y<844,'Source links must be in the mobile viewport after submission');
 assert.ok(await page.evaluate(()=>scrollY>0),'Submission must scroll below the form');
 for(const [name,value] of [['q',role],['country',country],['city',city]])assert.equal(await page.locator(`input[name=${name}]`).inputValue(),value);
 assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
 assert.ok(await page.locator('#search-sources').innerText().then(t=>t.includes(lang==='he'?'שאר המקורות פותחים חיפוש חיצוני, שתוצאותיו לא אומתו.':'Other sources open external searches whose results are not verified.')));
 // A second submission must keep locale/country and support an empty optional city.
 const next=lang==='he'?'מנהל מוצר':'Product Manager';await page.locator('input[name=q]').fill(next);await page.locator('input[name=city]').fill('');await submit(next);
 assert.equal(await page.locator('input[name=q]').inputValue(),next);assert.equal(await page.locator('input[name=country]').inputValue(),country);assert.equal(await page.locator('input[name=city]').inputValue(),'');
 await page.reload();await status.waitFor();assert.equal(await page.locator('input[name=q]').inputValue(),next);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log(`PASS /find ${lang} ${width}: submit scroll, ready feedback, criteria/locale persistence, repeat and reload`);
 await context.close();
}
}finally{await browser.close();}
