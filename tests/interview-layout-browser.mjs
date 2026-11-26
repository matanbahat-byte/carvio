import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
let launch={headless:true};if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:c.args,executablePath:await c.executablePath()};}
const browser=await chromium.launch(launch),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';

import {mkdir} from 'node:fs/promises';
const output=process.env.CARVIO_LAYOUT_OUTPUT||'artifacts/interview-layout';await mkdir(output,{recursive:true});
try{for(const width of [390,1366])for(const language of ['he','en']){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
 await context.addInitScript(language=>{sessionStorage.setItem('carvio.language.v1',JSON.stringify(language));sessionStorage.setItem('carvio.applications.v1',JSON.stringify([{id:'qa-layout',company:'QA Company',role:'QA Role',status:'Interview',requirements:language==='he'?'ניסיון בניתוח נתונים והצגת תובנות לצוותים עסקיים':'Experience analysing data and communicating findings to business teams',requirementEvidence:[{id:'r1',requirement:language==='he'?'ניסיון בניתוח נתונים והצגת תובנות לצוותים עסקיים':'Experience analysing data and communicating findings to business teams',evidence:language==='he'?'דוגמה שמורה לבדיקה: הכנתי דוח שבועי ועברתי עם הצוות על התוצאות. יש להשלים רק פרטים אמיתיים.':'Saved example for review: I prepared a weekly report and discussed results with the team. Add only real details.'}]}]));},language);
 await page.goto(`${base}/?workspace=1&demo=1`);
 const open=async()=>{await page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await page.locator('.command-palette input').fill('QA Role');await page.locator('.command-results').getByRole('button',{name:/QA Role/}).click();await page.getByRole('dialog').locator('details.workspace-more-context > summary').click();await page.getByRole('dialog').getByRole('button',{name:language==='he'?/^(פתיחת מרכז ההכנה|המשך הכנה)$/:/^(Open preparation workspace|Continue preparation)$/}).click();};
 await open();const before=await page.evaluate(()=>sessionStorage.getItem('carvio.applications.v1'));
 const card=page.locator('.interview-preparation-editor .workspace-evidence-list article').first();await card.scrollIntoViewIfNeeded();
 const metrics=await card.evaluate(el=>{const b=el.getBoundingClientRect(),div=el.firstElementChild,p=div.querySelector('p'),button=div.querySelector('button');return {card:b.width,text:div.getBoundingClientRect().width,paragraph:p.getBoundingClientRect().toJSON(),button:button.getBoundingClientRect().toJSON(),last:div.querySelectorAll('p')[1].getBoundingClientRect().toJSON(),overflow:el.scrollWidth>el.clientWidth,clamp:getComputedStyle(p).webkitLineClamp};});
 assert.ok(metrics.text>metrics.card*.8,JSON.stringify(metrics));assert.equal(metrics.overflow,false);assert.equal(metrics.clamp,'none');assert.ok(metrics.button.top>=metrics.last.bottom);assert.ok(metrics.button.right<=metrics.paragraph.right+1);assert.ok(metrics.button.left>=metrics.paragraph.left-1);
 await card.screenshot({path:`${output}/${language}-${width}-card.png`});await page.screenshot({path:`${output}/${language}-${width}.png`});
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('carvio.applications.v1')),before);
 console.log(`PASS suggestion layout ${language} ${width}: text ${Math.round(metrics.text)}/${Math.round(metrics.card)}px, no clamp/overflow/button overlap, stored data unchanged`);await context.close();
}}finally{await browser.close();}
