import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
const pkg=process.env.CARVIO_CHROMIUM_PACKAGE? (await import(process.env.CARVIO_CHROMIUM_PACKAGE)).default:null;
const server=spawn('node',['node_modules/next/dist/bin/next','start','-p','3126'],{stdio:'ignore'});
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:3126/find')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 const browser=await chromium.launch(pkg?{executablePath:await pkg.executablePath(),args:pkg.args,headless:true}:{headless:true});
 try{
 const page=await browser.newPage();
 for(const lang of ['he','en']){
  await page.goto(`http://localhost:3126/company-jobs?q=VP%20HR&country=Israel&city=Tel%20Aviv&lang=${lang}`,{waitUntil:'networkidle',timeout:30000});
  assert.equal(await page.locator('main').getAttribute('dir'),lang==='he'?'rtl':'ltr');
  await page.getByRole('heading',{level:1,name:lang==='he'?'משרות מאתרי החברות':'Jobs from employers'}).waitFor();
  const forms=page.locator('form[action="/api/company-jobs/open"]');
  for(const form of await forms.all()){
   assert.equal(await form.locator('input[name=country]').inputValue(),'Israel');
   assert.equal(await form.locator('input[name=location]').inputValue(),'Tel Aviv');
   const location=await form.locator('..').innerText();assert.match(location,/Israel|ישראל/);
  }
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`/tmp/carvio-company-${lang}-${width}.png`,fullPage:true});}
  console.log(JSON.stringify({language:lang,verifiedCards:await forms.count(),desktopAndMobile:'pass'}));
 }
 await page.goto('http://localhost:3126/find?q=VP%20HR&country=Israel&city=Tel%20Aviv&lang=he');
 assert.match(await page.locator('[data-search-provider=careers]').getAttribute('href'),/^\/company-jobs\?/);
 console.log('Company source opens internal verified results; source links retained.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
