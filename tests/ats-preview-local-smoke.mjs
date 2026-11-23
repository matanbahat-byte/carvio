import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
try {
  const cases = [
    { role: "Supply Chain Director", country: "Israel", city: "Tel Aviv" },
    { role: "Software Engineer", country: "Israel", city: "Tel Aviv" },
    { role: "HR Business Partner", country: "Israel", city: "" },
  ];
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1365, height: 900 }]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    for (const testCase of cases) {
      const params = new URLSearchParams({ q: testCase.role, country: testCase.country, city: testCase.city });
      const response = await page.goto("http://127.0.0.1:3100/ats-preview?" + params, { waitUntil: "networkidle", timeout: 45000 });
    assert.equal(response?.status(), 200, "preview route must be accessible");
    assert.ok(await page.getByRole("link", { name: /LinkedIn/i }).count() >= 2);
    assert.ok(await page.getByRole("link", { name: /Indeed/i }).count() >= 2);
    assert.ok(await page.getByRole("link", { name: /Google/i }).count() >= 2);
    for (const [name, host] of [["LinkedIn", "linkedin.com"], ["Indeed", "indeed.com"], ["Google", "google.com"]]) {
      const link = page.getByRole("link", { name: new RegExp(name, "i") }).first();
      const target = new URL(await link.getAttribute("href"));
      assert.ok(target.hostname === host || target.hostname.endsWith("." + host), name + " host mismatch");
      assert.equal(target.protocol, "https:", name + " must use HTTPS");
      assert.equal(target.username, "", name + " must not contain URL credentials");
      assert.equal(target.password, "", name + " must not contain URL credentials");
      assert.ok(target.search.length > 0, name + " search query missing");
    }
    assert.ok(await page.getByText(/קישורי חיפוש, לא משרות שנמצאו או אומתו/).isVisible());
    const bodyBg = await page.locator(".ats-pilot-light").evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(bodyBg, "rgb(247, 248, 255)", "pilot must remain light even on mobile");
    await mkdir("artifacts/ats-preview", { recursive: true });
    await page.screenshot({ path: "artifacts/ats-preview/" + viewport.name + "-" + testCase.role.toLowerCase().replaceAll(" ", "-") + ".png", fullPage: true });
    console.log(viewport.name + " / " + testCase.role + ": external search links verified; no live job relevance asserted; theme " + bodyBg);
    }
    await page.close();
  }
} finally { await browser.close(); }
