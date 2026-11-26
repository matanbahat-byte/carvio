import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
const base=process.env.CARVIO_BASE_URL||'http://127.0.0.1:3120';
try {
 for(const width of [390,1366]) for(const language of ['he','en']) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(language=>sessionStorage.setItem('carvio.language.v1',JSON.stringify(language)),language);
  const page=await context.newPage();await page.goto(`${base}/?workspace=1&demo=1`);
  if(width>=768) await page.locator('.calm-desktop-nav .calm-nav-button').nth(4).click();
  else {await page.locator('.calm-mobile-nav button').nth(4).click();await page.locator('.mobile-more-menu button').nth(1).click();}
  await page.locator('.tools-picker button').nth(1).click();
  const review=page.locator('#cv-lab');
  const source=review.getByRole('textbox',{name:language==='he'?'טקסט קורות החיים לבדיקה':'CV text for review'});
  const draft=()=>review.getByRole('textbox',{name:language==='he'?'טיוטה נקייה להעתקה':'Clean draft to copy'});
  for(const cv of ['Skills: SQL, Excel\n• Reduced costs by 20%\n• Supported 12 employees\n\n\nResponsible for sales\nHelped 3 teams','כישורים: אקסל\n• צמצמתי עלויות ב־20%\n• סייעתי ל־12 עובדים']) {
   if(!await source.isVisible()) await review.locator('details').last().locator('summary').click();
   await source.fill(cv);
   const feedback=await review.locator('.insight-box').allTextContents();
   assert.match(feedback.join(' '),language==='he'?/זוהתה התייחסות לכישורים/:/Skills or expertise wording detected/);
   assert.match(feedback.join(' '),language==='he'?/זוהו מספרים/:/Numbers detected/);
   assert.doesNotMatch(feedback.join(' '),/Add measurable outcomes|Add a compact skills section/);
   await review.getByRole('button',{name:language==='he'?'יצירת טיוטה נקייה':'Create clean draft',exact:true}).click();
   assert.equal(await draft().inputValue(),cv.replace(/\n{3,}/g,'\n\n'));
   await draft().fill('Manual draft — עריכה ידנית');
   assert.equal(await draft().inputValue(),'Manual draft — עריכה ידנית');
   if(!await source.isVisible()) await review.locator('details').last().locator('summary').click();
   await source.fill(cv+'\n');assert.equal(await draft().inputValue(),'Manual draft — עריכה ידנית','source edits must not overwrite the draft');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log(`PASS CV ${language} ${width}: present skills/bullets/numbers, source language/facts, clean draft, independent manual edits`);
  await context.close();
 }
}finally{await browser.close();}
