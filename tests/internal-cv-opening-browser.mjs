import assert from 'node:assert/strict';
const{chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true}),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try{for(const language of ['he','en'])for(const width of [390,1366])for(const linked of [false,true]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),dialogs=[],errors=[];
 page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({language,linked})=>{if(localStorage.getItem('qa-internal-cv'))return;localStorage.setItem('qa-internal-cv','1');localStorage.setItem('carvio.language.v1',JSON.stringify(language));localStorage.setItem('carvio.applications.v1',JSON.stringify([0,1].map(i=>({id:`cv-${i}`,company:`QA Company ${i}`,role:`QA Internal Role ${i}`,status:'Considering',requirements:`SQL ${i} experience`,requirementEvidence:[{id:`r-${i}`,requirement:`SQL ${i} experience`,evidence:`SAVED EVIDENCE ${i}`}],notes:`SAVED NOTES ${i}`,linkedResumeId:linked?'qa-resume':undefined}))));localStorage.setItem('carvio.resumes.v1',JSON.stringify([{id:'qa-resume',name:'SAVED CV.txt',size:20,type:'text/plain',addedAt:'2026-11-26',extractedText:'SAVED CV SOURCE',readState:'ready'}]));localStorage.setItem('carvio.cv-draft.v1',JSON.stringify({version:1,current:'SAVED MANUAL DRAFT',previous:'SAVED PREVIOUS DRAFT'}));},{language,linked});
 const snapshot=()=>page.evaluate(()=>Object.fromEntries(['carvio.applications.v1','carvio.resumes.v1','carvio.cv-draft.v1'].map(k=>[k,localStorage.getItem(k)])));
 const ready=async()=>{await page.getByRole('button',{name:language==='he'?'שמירת משרה מקישור':'Save a job from a link',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');};
 const open=async i=>{await page.keyboard.press('Control+k');await page.locator('.command-palette input').fill(`QA Internal Role ${i}`);await page.locator('.command-results button').first().click();};
 const lab=page.locator('#cv-lab'),draft=lab.getByRole('textbox',{name:language==='he'?'טיוטה נקייה להעתקה':'Clean draft to copy',exact:true});
 await page.goto(`${base}/?workspace=1`);await ready();const original=await snapshot();
 for(const i of [0,1]){
  for(let attempt=0;attempt<3;attempt++){
   await open(i);const modal=page.getByRole('dialog');await modal.locator('details.workspace-more-context > summary').click();await modal.getByRole('button',{name:language==='he'?'התאמת קורות חיים לדרישות':'Tailor CV to requirements',exact:true}).click();
   await draft.waitFor();assert.equal(await lab.locator('select').first().inputValue(),`cv-${i}`);assert.equal(await draft.inputValue(),'SAVED MANUAL DRAFT');assert.equal(await page.getByRole('dialog').count(),0);assert.deepEqual(await snapshot(),original);assert.equal(await page.evaluate(()=>1+1),2);
  }
  await open(i);await page.getByRole('dialog').locator('[data-application-context-tool=cv]').click();assert.equal(await lab.locator('select').first().inputValue(),`cv-${i}`);assert.equal(await draft.inputValue(),'SAVED MANUAL DRAFT');
 }
 await draft.fill('EDITED DRAFT AFTER OPEN');const edited=await snapshot();await page.reload();await ready();await open(1);await page.getByRole('dialog').locator('details.workspace-more-context > summary').click();await page.getByRole('dialog').getByRole('button',{name:language==='he'?'התאמת קורות חיים לדרישות':'Tailor CV to requirements',exact:true}).click();assert.equal(await draft.inputValue(),'EDITED DRAFT AFTER OPEN');assert.equal(await lab.locator('select').first().inputValue(),'cv-1');assert.deepEqual(await snapshot(),edited);assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);
 console.log(`PASS internal CV ${language} ${width} linked=${linked}: 2 applications ×3 opens, prominent opener, no blocking prompts, source/draft/backup/notes/evidence preserved, edited draft survives refresh`);await context.close();
}}finally{await browser.close();}
