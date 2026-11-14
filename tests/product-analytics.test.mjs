import test from "node:test";
import assert from "node:assert/strict";
import { activeDurationBucket, localDateKey, sanitizeAnalyticsProperties } from "../lib/product-analytics.ts";

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

test("duration buckets retain only coarse engagement ranges", () => {
  assert.equal(activeDurationBucket(29), "under_30s");
  assert.equal(activeDurationBucket(30), "30s_to_2m");
  assert.equal(activeDurationBucket(900), "15m_plus");
});

test("return-visit day keys use the browser local calendar", () => {
  const local = new Date(2026, 10, 14, 23, 30);
  assert.equal(localDateKey(local), "2026-11-14");
});
