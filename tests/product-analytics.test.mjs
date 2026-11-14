import test from "node:test";
import assert from "node:assert/strict";
import { acquisitionChannel, activeDurationBucket, isReturningVisit, localDateKey, sanitizeAnalyticsProperties } from "../lib/product-analytics.ts";

test("analytics properties keep funnel dimensions and remove personal content", () => {
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      screen: "applications",
      status: "Applied",
      sourceType: "Company careers",
      company: "Private company",
      role: "Private role",
      email: "person@example.com",
      draft: "Private message",
    }),
    { screen: "applications", status: "Applied", sourceType: "Company careers" },
  );
});

test("acquisition attribution remains coarse and never stores full URLs", () => {
  assert.equal(acquisitionChannel("?utm_source=linkedin&utm_campaign=private-name", ""), "linkedin");
  assert.equal(acquisitionChannel("?utm_source=whatsapp", ""), "whatsapp");
  assert.equal(acquisitionChannel("", "https://www.google.com/search?q=carvio"), "search");
  assert.equal(acquisitionChannel("", ""), "direct");
});

test("duration buckets retain only coarse engagement ranges", () => {
  assert.equal(activeDurationBucket(29), "under_30s");
  assert.equal(activeDurationBucket(30), "30s_to_2m");
  assert.equal(activeDurationBucket(900), "15m_plus");
});

test("return-visit day keys use the browser local calendar", () => {
  const local = new Date(2026, 10, 14, 23, 30);
  assert.equal(localDateKey(local), "2026-11-14");
});

test("return prompt appears only after a visit on an earlier local day", () => {
  assert.equal(isReturningVisit(null, "2026-11-14"), false);
  assert.equal(isReturningVisit("2026-11-14", "2026-11-14"), false);
  assert.equal(isReturningVisit("2026-11-13", "2026-11-14"), true);
});
