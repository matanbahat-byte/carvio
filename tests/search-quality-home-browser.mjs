import assert from 'node:assert/strict';import {writeFile,mkdir}from'node:fs/promises';
const{chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true}),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120',phase=process.env.CARVIO_AUDIT_PHASE||'after',rows=[];
try{for(const language of ['he','en'])for(const width of [390,1366]){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();
 await context.addInitScript(({language})=>{sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.applications.v1',JSON.stringify([
 {id:'a',role:'QA Engineer',company:'Fixture',status:'Considering',jobUrl:'https://www.linkedin.com/jobs/view/123456',capturedAt:'2026-11-26'},
 {id:'b',role:'QA Engineer',company:'Fixture',status:'Considering',jobUrl:'https://il.linkedin.com/jobs/view/qa-engineer-at-fixture-123456?trk=x',capturedAt:'2026-11-25'},
 {id:'c',role:'Search page',company:'Fixture',status:'Considering',jobUrl:'https://www.linkedin.com/jobs/search/?keywords=QA',capturedAt:'2026-11-24'},
 {id:'d',role:'Closed role',company:'Fixture',status:'Rejected',jobUrl:'https://www.linkedin.com/jobs/view/987654',capturedAt:'2026-11-23'}]));sessionStorage.setItem('carvio.search-profile.v1',JSON.stringify({role:'Engineer',country:'אירלנד',location:'Dublin'}));},{language});
 await page.goto(`${base}/?workspace=1&demo=1`);await page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 const section=page.locator('section').filter({has:page.getByRole('heading',{name:language==='he'?'המשרות והחיפושים שלכם, במקום אחד':'Your saved jobs and searches in one place',exact:true})}).first();
 const originals=await section.locator('a').filter({hasText:language==='he'?'פתיחת המשרה המקורית':'Open original job'}).evaluateAll(els=>els.map(el=>el.href));
 const checks={onePostingWithoutDuplicates:originals.length===1,noSearchAsPosting:!originals.some(url=>url.includes('/jobs/search')),closedExcluded:!(await section.innerText()).includes('Closed role')};
 if(phase==='after')for(const[name,value]of Object.entries(checks))assert.ok(value,`${language} ${width} ${name}: ${originals}`);
 rows.push({language,width,originals,checks});console.log(`HOME ${phase} ${language} ${width}: ${JSON.stringify(checks)}`);await context.close();
}}finally{await browser.close();}
await mkdir('docs/search-quality',{recursive:true});await writeFile(`docs/search-quality/home-${phase}.json`,JSON.stringify(rows,null,2)+'\n');
