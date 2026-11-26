import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const lang of ['he','en'])for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
 await context.addInitScript(()=>{
  window.qaMode='copy';window.qaShared=[];window.qaCopied=[];
  Object.defineProperty(navigator,'share',{configurable:true,get:()=>window.qaMode==='copy'||window.qaMode==='error'?undefined:async data=>{if(window.qaMode==='cancel')throw new DOMException('Cancelled','AbortError');if(window.qaMode==='fallback')throw new DOMException('Unavailable','NotAllowedError');window.qaShared.push(data.url);}});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(window.qaMode==='error')throw new DOMException('Denied','NotAllowedError');window.qaCopied.push(value);}}});
 });
 const role=lang==='he'?'מנהל משאבי אנוש':'Software Engineer',city=lang==='he'?'באר שבע':'Tel Aviv';
 await page.goto(`${base}/find?${new URLSearchParams({lang,q:role,country:'Israel',city,searchedAt:'2026-11-26T10:00:00Z',account:'private-test',application:'private-test'})}`);
 const sources=await page.locator('[data-search-provider]').evaluateAll(els=>els.map(e=>e.href));
 const button=page.getByRole('button',{name:lang==='he'?'שיתוף החיפוש':'Share search',exact:true});
 await button.click();await page.getByText(lang==='he'?'קישור החיפוש הועתק.':'Search link copied.',{exact:true}).waitFor();
 const shared=await page.evaluate(()=>window.qaCopied[0]),url=new URL(shared);
 assert.deepEqual([...url.searchParams.keys()],['q','country','city']);assert.equal(url.searchParams.get('q'),role);assert.equal(url.searchParams.get('city'),city);assert.equal(url.origin,new URL(base).origin);
 await page.evaluate(()=>window.qaMode='native');await button.click();await page.getByText(lang==='he'?'החיפוש שותף.':'Search shared.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.qaShared[0]),shared);
 await page.evaluate(()=>window.qaMode='fallback');await button.click();await page.getByText(lang==='he'?'קישור החיפוש הועתק.':'Search link copied.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.qaCopied.length),2);
 await page.evaluate(()=>window.qaMode='cancel');await button.click();await page.waitForFunction(()=>!document.querySelector('#search-sources button').disabled);assert.equal(await page.evaluate(()=>window.qaCopied.length),2);
 await page.evaluate(()=>window.qaMode='error');await button.click();await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.qaCopied.length),2);
 assert.deepEqual(await page.locator('[data-search-provider]').evaluateAll(els=>els.map(e=>e.href)),sources);
 await page.goto(shared);assert.equal(await page.locator('input[name=q]').inputValue(),role);assert.equal(await page.locator('input[name=country]').inputValue(),'Israel');assert.equal(await page.locator('input[name=city]').inputValue(),city);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log(`PASS share ${lang} ${width}: native/copy/fallback/cancel/error, clean URL, same criteria, source URLs unchanged`);await context.close();
}}finally{await browser.close();}
