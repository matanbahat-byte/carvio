import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const cases=JSON.parse(await readFile(new URL('./fixtures/search-quality.json',import.meta.url),'utf8'));
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120',phase=process.env.CARVIO_AUDIT_PHASE||'after',rows=[];
const scenarios=cases.flatMap((_,i)=>process.env.CARVIO_AUDIT_MATRIX==='1'?['he','en'].flatMap(language=>[390,1366].map(width=>({i,language,width}))):[{i,language:i%10<5?'he':'en',width:i%2?1366:390}]);
try{for(const {i,language,width}of scenarios){
 const [role,country,city,translation,domain]=cases[i];
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/find?lang=${language}`);
 for(const [name,value]of [['q',role],['country',country],['city',city]])await page.locator(`input[name=${name}]`).fill(value);
 await Promise.all([page.waitForURL(u=>u.searchParams.get('q')===role&&u.hash==='#search-sources'),page.locator('form button[type=submit]').click()]);
 const links=await page.locator('[data-search-provider]').evaluateAll(els=>els.map(el=>({id:el.dataset.searchProvider,url:el.href})));
 assert.equal(links.length,4);assert.ok((await page.locator('#search-sources').innerText()).includes(language==='he'?'לא משרות':'not job listings'));assert.deepEqual(errors,[]);
 const urls=Object.fromEntries(links.map(l=>[l.id,new URL(l.url)]));
 const keyword=urls.linkedin.searchParams.get('keywords'),indeed=urls.indeed.searchParams.get('q'),careers=urls.careers.searchParams.get('q');
 const checks={localIndeed:urls.indeed.hostname===domain,roleTranslation:[keyword,indeed,careers].every(q=>q.includes(translation)),noAutomaticAdjacentRoles:!(/Director|Head of/.test(keyword)&&!/Director|Head of/.test(role)),careerRoleParity:!keyword.includes(' OR ')||keyword.split(' OR ').every(term=>careers.includes(term.replace(/[()]/g,''))),noHorizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)};
 if(phase==='after')for(const [name,value]of Object.entries(checks))assert.ok(value,`${i+1} ${name}: ${keyword} / ${careers}`);
 rows.push({case:i+1,role,country,city,language,width,checks,links});await context.close();console.log(`AUDIT ${phase} ${i+1}/20 ${role}: ${JSON.stringify(checks)}`);
}}finally{await browser.close();}
await mkdir('docs/search-quality',{recursive:true});await writeFile(`docs/search-quality/${phase}.json`,JSON.stringify({phase,base,cases:rows},null,2)+'\n');
