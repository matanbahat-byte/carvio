import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {emptySearchProfile} from '../lib/job-search.ts';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
await mkdir('artifacts/resume-search',{recursive:true});
try{
for(const language of ['he','en'])for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const profile={...emptySearchProfile,role:language==='he'?'מנהל מוצר':'Product Manager',country:'Israel',location:'Tel Aviv',datePosted:'Any time',employmentType:'',lastSearchedAt:'2026-11-25T10:00:00Z'};
 await context.addInitScript(({language,profile})=>{if(!sessionStorage.getItem('resume-fixture')){sessionStorage.setItem('resume-fixture','1');sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.search-profile.v1',JSON.stringify(profile));}},{language,profile});
 await page.goto(`${base}/?workspace=1&demo=1`);
 // Returning visitors resume from their home screen after a fresh page load.
 await page.reload();
 const button=page.getByRole('button',{name:language==='he'?'המשך החיפוש':'Continue your search',exact:true});await button.waitFor();
 const before=await page.evaluate(()=>sessionStorage.getItem('carvio.applications.v1'));
 const edit=page.getByRole('link',{name:language==='he'?'שינוי חיפוש':'Edit search',exact:true});
 assert.equal(new URL(await edit.getAttribute('href'),base).searchParams.get('lang'),language);
 await button.click();await page.locator('#search-results').waitFor();
 assert.equal(await page.locator('input[list=carvio-role-options]').inputValue(),profile.role);
 assert.equal(await page.locator('input[list=carvio-city-options]').inputValue(),profile.location);
 assert.equal(await page.getByRole('combobox',{name:language==='he'?'מדינה':'Country',exact:true}).inputValue(),profile.country);
 const source=page.locator('a[href*="linkedin.com/jobs/search"]:visible').first();
 await source.waitFor();assert.ok(new URL(await source.getAttribute('href')).searchParams.get('location').includes('Tel Aviv'));
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('carvio.applications.v1')),before);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(context.pages().length,1,'Resume must not open unsolicited external tabs');
 await page.screenshot({path:`artifacts/resume-search/${language}-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);console.log(`PASS resume ${language} ${width}: one click, criteria, sources, data preserved`);
 // An incomplete search must never expose a runnable resume action.
 await page.evaluate(()=>sessionStorage.setItem('carvio.search-profile.v1',JSON.stringify({role:'',country:'',location:''})));
 await page.reload();await page.getByRole('link',{name:language==='he'?'מציאת משרות':'Find jobs',exact:true}).first().waitFor();
 assert.equal(await page.getByRole('button',{name:language==='he'?'המשך החיפוש':'Continue your search',exact:true}).count(),0);
 await context.close();
}
}finally{await browser.close();}
