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
