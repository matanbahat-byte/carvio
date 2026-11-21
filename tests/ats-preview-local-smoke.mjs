import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const url = "http://127.0.0.1:3100/ats-preview?q=Supply%20Chain%20Director&country=Israel&city=Tel%20Aviv";
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1365, height: 900 }]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    assert.equal(response?.status(), 200, "preview route must be accessible");
    assert.ok(await page.getByRole("link", { name: /LinkedIn/i }).count() >= 2);
    assert.ok(await page.getByRole("link", { name: /Indeed/i }).count() >= 2);
    assert.ok(await page.getByRole("link", { name: /Google/i }).count() >= 2);
    for (const [name, host] of [["LinkedIn", "linkedin.com"], ["Indeed", "indeed.com"], ["Google", "google.com"]]) {
      const link = page.getByRole("link", { name: new RegExp(name, "i") }).first();
      const target = new URL(await link.getAttribute("href"));
      assert.ok(target.hostname === host || target.hostname.endsWith("." + host), name + " host mismatch");
      assert.ok(target.search.length > 0, name + " search query missing");
    }
    assert.ok(await page.getByText(/קישורי חיפוש, לא משרות שנמצאו או אומתו/).isVisible());
    const bodyBg = await page.locator(".ats-pilot-light").evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(bodyBg, "rgb(247, 248, 255)", "pilot must remain light even on mobile");
    await mkdir("artifacts/ats-preview", { recursive: true });
    await page.screenshot({ path: "artifacts/ats-preview/" + viewport.name + ".png", fullPage: true });
    console.log(viewport.name + ": links verified, theme " + bodyBg);
    await page.close();
  }
} finally { await browser.close(); }
