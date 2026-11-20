import { chromium, devices } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.CARVIO_BASE_URL || "https://carvio-pi.vercel.app/?workspace=1";
const output = "artifacts/browser-smoke";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
let failed = false;
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1440, height: 900 } }],
    ["mobile", { ...devices["Pixel 7"] }],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const exceptions = [];
    page.on("pageerror", (error) => exceptions.push(error.message));
    const response = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.ok(response, name + ": no HTTP response");
    assert.ok(response.status() < 400, name + ": HTTP " + response.status());
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    assert.ok(body.trim().length > 80, name + ": page has too little visible content");
    assert.ok(/carvio/i.test(body + " " + (await page.title())), name + ": CARVIO branding missing");
    assert.ok(!/application error: a client-side exception has occurred/i.test(body), name + ": Next.js client error");
    assert.deepEqual(exceptions, [], name + ": uncaught browser exceptions");
    // Exercise the public search flow without opening external sites or writing user data.
    const searchEntry = page.locator(".first-job-decision-actions button").filter({ hasText: /search|לחיפוש/i });
    if (await searchEntry.count() && await searchEntry.first().isVisible()) {
      await searchEntry.first().click();
      const roleInput = page.locator('input[list="carvio-role-options"]');
      await roleInput.waitFor({ state: "visible", timeout: 10000 });
      await roleInput.fill("Supply Chain Manager");
      const countrySelect = page.locator(".search-form-grid select").first();
      await countrySelect.selectOption({ label: "Israel" });
      const launch = page.locator(".search-launch-button");
      assert.ok(await launch.isEnabled(), name + ": search launch disabled after valid role and country");
      await launch.click();
      const searchCards = page.locator("a[href*='linkedin.com'], a[href*='indeed.com'], a[href*='google.com']");
      await searchCards.first().waitFor({ state: "attached", timeout: 10000 });
      const destinations = await searchCards.evaluateAll((links) => links.map((a) => a.href));
      const isHost = (url, host) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === "https:" && (parsed.hostname === host || parsed.hostname.endsWith("." + host));
        } catch {
          return false;
        }
      };
      assert.ok(destinations.some((url) => isHost(url, "linkedin.com")), name + ": LinkedIn search link missing");
      assert.ok(destinations.some((url) => isHost(url, "google.com") || isHost(url, "indeed.com")), name + ": alternative search source missing");
      assert.ok(destinations.every((url) => url.startsWith("https://")), name + ": search sources must use HTTPS");
      // Source links need discernible labels for keyboard and screen-reader users.
      const sourceLabels = await searchCards.evaluateAll((links) => links.map((a) =>
        (a.getAttribute("aria-label") || a.innerText || a.getAttribute("title") || "").trim()
      ));
      assert.ok(sourceLabels.every((label) => label.length > 0), name + ": unlabeled external search link");
      console.log("PASS " + name + " search | sources " + destinations.length);
    } else {
      throw new Error(name + ": search entry missing; refusing to silently skip the search journey");
    }
    await page.screenshot({ path: output + "/" + name + ".png", fullPage: true });
    console.log("PASS " + name + " | HTTP " + response.status() + " | title: " + await page.title());
    await context.close();
  }
} catch (error) {
  failed = true;
  console.error("FAIL browser smoke:", error);
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
