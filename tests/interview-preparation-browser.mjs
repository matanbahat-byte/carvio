import assert from 'node:assert/strict';
const { chromium } = await import(process.env.CARVIO_PLAYWRIGHT_MODULE || 'playwright');
let launch = { headless: true };
if (process.env.CARVIO_CHROMIUM_PACKAGE) {
  const { default: c } = await import(process.env.CARVIO_CHROMIUM_PACKAGE);
  launch = { ...launch, args: c.args, executablePath: await c.executablePath() };
}
const browser = await chromium.launch(launch);
const base = process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3120';
try {
  for (const width of [390, 1366]) for (const language of ['he', 'en']) for (const evidence of [true, false]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await context.addInitScript(({ language, evidence }) => {
      if (sessionStorage.getItem('prep-fixture')) return;
      sessionStorage.setItem('prep-fixture', '1');
      sessionStorage.setItem('carvio.language.v1', JSON.stringify(language));
      sessionStorage.setItem('carvio.applications.v1', JSON.stringify([{
        id: 'qa-prep', company: 'QA Company', role: 'QA Role', status: 'Interview', requirements: 'SQL\nPython',
        requirementEvidence: [
          { id: 'r1', requirement: 'SQL', evidence: evidence ? 'Saved real reporting example' : '' },
          { id: 'r2', requirement: 'Python', evidence: '' },
        ],
      }]));
    }, { language, evidence });
    await page.goto(`${base}/?workspace=1&demo=1`);
    const switcher = () => page.getByRole('button', { name: language === 'he' ? 'החלפת שפה לאנגלית' : 'Switch language to Hebrew', exact: true });
    const switchBack = () => page.getByRole('button', { name: language === 'he' ? 'Switch language to Hebrew' : 'החלפת שפה לאנגלית', exact: true });
    // No modal: both directions work, including after refresh.
    await switcher().click(); await switchBack().click();
    await page.reload(); await switcher().waitFor();
    const open = async () => {
      await page.getByRole('button', { name: language === 'he' ? 'שמירת משרה מקישור' : 'Save a job from a link', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Control+k');
      await page.locator('.command-palette input').fill('QA Role');
      await page.locator('.command-results').getByRole('button', { name: /QA Role/ }).click();
      await openPreparation();
    };
    const openPreparation = async () => {
      await page.getByRole('dialog').locator('details.workspace-more-context > summary').click();
      await page.getByRole('dialog').getByRole('button', { name: language === 'he' ? /^(פתיחת מרכז ההכנה|המשך הכנה)$/ : /^(Open preparation workspace|Continue preparation)$/ }).click();
    };
    await open();
    const quick = page.getByRole('region',{name:language==='he'?'הכנה מהירה לראיון':'Quick interview preparation'});
    await quick.getByRole('combobox',{name:language==='he'?'סוג הראיון':'Interview type'}).selectOption('Executive');
    await quick.getByRole('combobox',{name:language==='he'?'שפת הראיון':'Interview language'}).selectOption('en');
    await quick.getByRole('button',{name:language==='he'?'הכנת ערכת הראיון שלי':'Create my interview brief'}).click();
    assert.equal(await quick.locator('.interview-brief-cards').getAttribute('dir'),'ltr');
    assert.ok(await quick.locator('.interview-brief-card').count()>=5);
    await quick.locator('.interview-brief-edit summary').click();
    const brief=quick.getByRole('textbox',{name:language==='he'?'ערכת הכנה אישית לעריכה':'Editable personal interview brief'});
    assert.match(await brief.inputValue(),/QA Role · QA Company/);
    assert.match(await brief.inputValue(),/90 days/);
    assert.match(await brief.inputValue(),/Python/);
    if(evidence) assert.match(await brief.inputValue(),/Saved real reporting example/);
    await brief.fill('MY EDITED QUICK BRIEF');
    const fields = () => page.getByRole('dialog').locator('.interview-preparation-grid textarea');
    assert.equal(await fields().nth(0).inputValue(), '');
    assert.match(await fields().nth(2).inputValue(), /SQL/);
    assert.match(await fields().nth(3).inputValue(), /Python/);
    if (evidence) assert.match(await fields().nth(1).inputValue(), /Saved real reporting example/);
    else assert.equal(await fields().nth(1).inputValue(), '');
    const unchangedQuestions = await fields().nth(2).inputValue();
    const cards = page.locator('.interview-preparation-editor .workspace-evidence-list article');
    for (let i = 0; i < 2; i++) {
      const card = cards.nth(i);
      const button = card.getByRole('button');
      const targetId = await button.getAttribute('aria-controls');
      const target = page.locator(`#${targetId}`);
      const expected = (await card.locator('p').allTextContents()).join('\n');
      for (const manual of ['', 'Manual edit\nKeep this formatting']) {
        await target.fill(manual);
        await button.click();
        const expectedValue = manual ? `${manual}\n\n${expected}` : expected;
        await page.waitForFunction(id => document.activeElement?.id === id, targetId);
        assert.equal(await target.inputValue(), expectedValue);
        const visible = await target.evaluate(el => {
          const rect = el.getBoundingClientRect();
          const body = el.closest('.modal-dialog-body').getBoundingClientRect();
          return rect.top >= body.top && rect.bottom <= body.bottom && rect.top >= 0 && rect.bottom <= innerHeight;
        });
        assert.ok(visible, `target ${targetId} should be revealed at ${width}px`);
        assert.equal(await target.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd)), expected);
        await button.click();
        await page.waitForFunction(id => document.activeElement?.id === id, targetId);
        assert.equal(await target.inputValue(), expectedValue, 'repeated click must not duplicate');
        assert.equal(await fields().nth(2).inputValue(), unchangedQuestions, 'other field remains intact');
      }
    }
    const expectedStories = await fields().nth(1).inputValue();
    const expectedGaps = await fields().nth(3).inputValue();
    await fields().nth(2).fill('');
    await page.getByRole('dialog').getByRole('button', { name: language === 'he' ? 'שמירת ההכנה' : 'Save preparation', exact: true }).click();
    await openPreparation();
    await quick.locator('.interview-brief-edit summary').click();
    assert.equal(await brief.inputValue(), 'MY EDITED QUICK BRIEF');
    assert.equal(await fields().nth(1).inputValue(), expectedStories);
    assert.equal(await fields().nth(3).inputValue(), expectedGaps);
    assert.equal(await fields().nth(2).inputValue(), '');
    // Closing preparation returns to the job workspace; close that too.
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await switcher().click(); await switchBack().click();
    await page.reload(); await open();
    assert.equal(await fields().nth(1).inputValue(), expectedStories);
    assert.equal(await fields().nth(3).inputValue(), expectedGaps);
    assert.equal(await fields().nth(2).inputValue(), '');
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('carvio.applications.v1'))[0]);
    assert.equal(saved.requirementEvidence[0].evidence, evidence ? 'Saved real reporting example' : '');
    console.log(`PASS prep ${language} ${width}px evidence=${evidence}: auto-fill, empty/manual additions, reveal/selection, repeated click, save/reopen/reload, language before/after closing`);
    await context.close();
  }
} finally { await browser.close(); }
