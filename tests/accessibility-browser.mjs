const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
const {default:AxeBuilder}=await import(process.env.CARVIO_AXE_MODULE||'@axe-core/playwright');
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}), report=[];
const base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
await mkdir('artifacts/acceptance-65',{recursive:true});
try{for(const width of [390,1366])for(const lang of ['he','en']){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await context.addInitScript(lang=>{sessionStorage.setItem('carvio.language.v1',JSON.stringify(lang));localStorage.setItem('carvio.language.v1',JSON.stringify(lang));},lang);
 const page=await context.newPage();
 const scan=async label=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.push({width,lang,label,violations:result.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});await page.screenshot({path:`artifacts/acceptance-65/${lang}-${width}-${label}.png`,fullPage:true});await writeFile('artifacts/acceptance-65/accessibility.json',JSON.stringify(report,null,2));};
 await page.goto(`${base}/find?lang=${lang}`);await page.locator('form[data-find-search]').waitFor();await scan('find');
 await page.goto(`${base}/?workspace=1&demo=1`);await page.locator('.calm-mobile-nav').waitFor({state:'attached'});await scan('home');
 if(width>=768)await page.locator('.calm-desktop-nav .calm-nav-button').nth(4).click();else{await page.locator('.calm-mobile-nav button').nth(4).click();await page.locator('.mobile-more-menu button').nth(1).click();}
 await page.locator('.tools-picker button').nth(1).click();await scan('cv');
 await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify(report.map(r=>({width:r.width,lang:r.lang,label:r.label,violations:r.violations.map(v=>v.id)})),null,2));
if(report.some(r=>r.violations.length))process.exitCode=1;
