import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

// Run against a local/preview build with no real production user data.
const base = process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3111';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const [language, viewport] of [['en', { width: 1280, height: 800 }], ['he', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(({ language }) => {
      localStorage.setItem('carvio.cloud-local-owner.v1', 'controlled-other-account');
      localStorage.setItem('carvio.language.v1', JSON.stringify(language));
      localStorage.setItem('carvio.applications.v1', JSON.stringify([{ id: 'private-fixture', company: 'PRIVATE_COMPANY_MUST_NOT_RENDER', role: 'PRIVATE_ROLE_MUST_NOT_RENDER' }]));
      localStorage.setItem('carvio.contacts.v1', JSON.stringify([{ id: 'private-contact', name: 'PRIVATE_CONTACT_MUST_NOT_RENDER' }]));
    }, { language });
    await page.goto(`${base}/?workspace=1`);
    await page.locator('#workspace-locked-title').waitFor();
    assert.equal(await page.locator('body').innerText().then(text => /PRIVATE_/.test(text)), false);
    const unchanged = await page.evaluate(() => JSON.parse(localStorage.getItem('carvio.applications.v1')));
    assert.equal(unchanged[0].company, 'PRIVATE_COMPANY_MUST_NOT_RENDER');
    assert.equal(unchanged.length, 1);
    assert.equal(await page.locator('main').getAttribute('dir'), language === 'he' ? 'rtl' : 'ltr');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.reload();
    await page.locator('#workspace-locked-title').waitFor();
    assert.equal(await page.locator('body').innerText().then(text => /PRIVATE_/.test(text)), false);
    await page.locator('a[href="/find"]').click();
    await page.waitForURL('**/find');
    assert.equal(await page.locator('input[name="q"]').count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS owned workspace remains hidden and unchanged: ${language}, ${viewport.width}px`);
  }
} finally { await browser.close(); }
