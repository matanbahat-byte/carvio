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
  for (const lang of ['en', 'he']) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async url => { window.sharedUrl = url; } } });
    });
    const page = await context.newPage();
    const criteria = { q: lang === 'he' ? 'מנהל משאבי אנוש' : 'R&D & Product', country: lang === 'he' ? 'ישראל' : 'Israel', city: lang === 'he' ? 'תל אביב' : 'Tel Aviv' };
    await page.goto(`${base}/find?${new URLSearchParams({ ...criteria, lang, email: 'private@example.test', searchedAt: '2026-11-26T10:00:00Z' })}`);
    const sources = await page.locator('[data-search-provider]').evaluateAll(nodes => nodes.map(n => n.href));
    await page.getByRole('button', { name: lang === 'he' ? 'שיתוף החיפוש' : 'Share search', exact: true }).click();
    await page.waitForFunction(() => window.sharedUrl);
    const shared = await page.evaluate(() => window.sharedUrl);
    const url = new URL(shared);
    assert.deepEqual([...url.searchParams.keys()].sort(), ['q', 'country', 'city', 'lang'].sort());
    assert.equal(url.searchParams.get('lang'), lang);
    for (const stored of [null, lang === 'he' ? 'en' : 'he']) {
      const clean = await browser.newContext();
      if (stored) await clean.addInitScript(value => localStorage.setItem('carvio.language.v1', JSON.stringify(value)), stored);
      const recipient = await clean.newPage();
      await recipient.goto(shared);
      assert.equal(await recipient.locator('main').getAttribute('lang'), lang);
      assert.equal(await recipient.locator('main').getAttribute('dir'), lang === 'he' ? 'rtl' : 'ltr');
      for (const [key, value] of Object.entries(criteria)) assert.equal(await recipient.locator(`input[name="${key}"]`).inputValue(), value);
      assert.deepEqual(await recipient.locator('[data-search-provider]').evaluateAll(nodes => nodes.map(n => n.href)), sources);
      await clean.close();
    }
    await context.close();
    console.log(`PASS ${lang}: share, four public fields only, clean browser and opposite saved language, criteria and source links preserved`);
  }
} finally { await browser.close(); }
