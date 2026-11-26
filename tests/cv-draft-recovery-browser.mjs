import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
const key='carvio.cv-draft.v1';
try{for(const width of [390,1366].filter(x=>!process.env.CARVIO_QA_WIDTH||String(x)===process.env.CARVIO_QA_WIDTH))for(const language of ['he','en'].filter(x=>!process.env.CARVIO_QA_LANGUAGE||x===process.env.CARVIO_QA_LANGUAGE))for(const demo of [false,true].filter(x=>!process.env.CARVIO_QA_STORAGE||(x?'demo':'guest')===process.env.CARVIO_QA_STORAGE)){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 await context.addInitScript(({language,demo})=>{
  const s=demo?sessionStorage:localStorage;if(s.getItem('qa-cv-seeded'))return;s.setItem('qa-cv-seeded','1');
  s.setItem('carvio.language.v1',JSON.stringify(language));
  s.setItem('carvio.applications.v1',JSON.stringify([{id:'qa-cv',company:'QA Company',role:'QA CV Role',linkedResumeId:'qa-resume'}]));
  s.setItem('carvio.resumes.v1',JSON.stringify([{id:'qa-resume',name:'QA CV.txt',size:30,type:'text/plain',addedAt:'2026-11-26',extractedText:'Linked source: supported 3 teams',readState:'ready'}]));
 },{language,demo});
 await page.goto(`${base}/?workspace=1${demo?'&demo=1':''}`);
 const review=page.locator('#cv-lab');
 const draft=()=>review.getByLabel(language==='he'?'טיוטה נקייה להעתקה':'Clean draft to copy');
 const source=()=>review.getByLabel(language==='he'?'טקסט קורות החיים לבדיקה':'CV text for review');
 const generate=()=>review.getByRole('button',{name:language==='he'?'יצירת טיוטה נקייה':'Create clean draft',exact:true});
 const restore=()=>review.getByRole('button',{name:language==='he'?'שחזור הטיוטה הקודמת':'Restore previous draft',exact:true});
 const read=()=>page.evaluate(({key,demo})=>JSON.parse((demo?sessionStorage:localStorage).getItem(key)),{key,demo});
 const openCv=async()=>{if(width>=768)await page.locator('.calm-desktop-nav .calm-nav-button').nth(4).click();else{await page.locator('.calm-mobile-nav button').nth(4).click();await page.locator('.mobile-more-menu button').nth(1).click();}await page.locator('.tools-picker button').nth(1).click();await generate().waitFor();};
 const fillSource=async text=>{if(!await source().isVisible())await review.getByText(language==='he'?'הדבקת טקסט או עריכת הטקסט שחולץ':'Paste text or edit extracted text',{exact:true}).click();await source().fill(text);};
 const openTailor=async()=>{await page.keyboard.press('Control+k');await page.locator('.command-palette input').fill('QA CV Role');await page.locator('.command-results button').first().click();await page.getByRole('dialog').locator('details.workspace-more-context > summary').click();return page.getByRole('dialog').getByRole('button',{name:language==='he'?'התאמת קורות חיים לדרישות':'Tailor CV to requirements',exact:true});};
 const answer=async(button,accept)=>{const pending=page.waitForEvent('dialog',{timeout:15000}),click=button.click();const dialog=await pending;assert.equal(dialog.type(),'confirm');assert.match(dialog.message(),language==='he'?/עותק קודם/:/previous copy/);await (accept?dialog.accept():dialog.dismiss());await click;};
 await openCv();await fillSource('Original source');await generate().click();await draft().fill('Manual A\nעריכה מקורית');
 for(const route of ['generate','tailor']){
  await page.reload();await openCv();assert.equal(await draft().inputValue(),'Manual A\nעריכה מקורית');
  const sourceB='Skills: SQL\n• Supported 12 people\n\n\nResponsible for sales';
  await fillSource(sourceB);const before=await read(),sourceBefore=await source().inputValue();
  let action=route==='tailor'?await openTailor():generate();
  await answer(action,false);assert.deepEqual(await read(),before);assert.equal(await draft().inputValue(),before.current);assert.equal(await source().inputValue(),sourceBefore);
  if(route==='tailor'){assert.ok(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');}
  await page.reload();await openCv();assert.deepEqual(await read(),before);await fillSource(sourceB);
  action=route==='tailor'?await openTailor():generate();await answer(action,true);
  const expected=route==='generate'?sourceB.replace(/\n{3,}/g,'\n\n'):'';
  assert.deepEqual(await read(),{version:1,current:expected,previous:before.current});
  await page.reload();await openCv();await review.locator('[data-cv-draft-recovery] > summary').click();
  assert.equal(await review.getByRole('textbox',{name:language==='he'?'תצוגת העותק הקודם':'Previous draft preview'}).inputValue(),before.current);
  if(route==='tailor'){
   await restore().click();assert.equal(await draft().inputValue(),before.current);assert.equal((await read()).previous,'');
   await page.reload();await openCv();assert.equal(await draft().inputValue(),before.current);
   await answer(await openTailor(),true);await page.reload();await openCv();await review.locator('[data-cv-draft-recovery] > summary').click();
   assert.deepEqual(await read(),{version:1,current:'',previous:before.current});
  }
  // Repeated creation must not destroy the prior manual copy, including after a clear by Tailor.
  await fillSource(route==='generate'?sourceB:'New source after tailoring');
  if(expected)await answer(generate(),true);else await generate().click();
  const regenerated=await read();assert.equal(regenerated.previous,before.current);
  await page.reload();await openCv();await review.locator('[data-cv-draft-recovery] > summary').click();
  await answer(restore(),false);assert.deepEqual(await read(),regenerated);
  await answer(restore(),true);assert.equal(await draft().inputValue(),before.current);
  await page.reload();await openCv();assert.equal(await draft().inputValue(),before.current);assert.equal((await read()).previous,regenerated.current);
  console.log(`PASS CV recovery ${route} ${language} ${width}px ${demo?'demo':'guest'}: persisted manual draft, cancel/no side effects, confirm/backup, repeat, refresh, cancel restore, restore/reload`);
 }
 // A failed atomic save must block replacing the visible current draft and its backup.
 await fillSource('Must not overwrite');const before=await read();
 await page.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('quota','QuotaExceededError');return set.call(this,k,v);};},key);
 await answer(generate(),true);assert.deepEqual(await read(),before);assert.equal(await draft().inputValue(),before.current);assert.ok(await review.getByRole('alert').isVisible());
 await context.close();
}}finally{await browser.close();}
