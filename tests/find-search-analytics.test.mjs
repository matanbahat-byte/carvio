import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("native GET search route mounts analytics and tags only approved outbound sources", () => {
  const page = readFileSync(new URL("../app/find/page.tsx", import.meta.url), "utf8");
  const tracking = readFileSync(new URL("../components/find-search-analytics.tsx", import.meta.url), "utf8");
  assert.match(page, /<FindSearchAnalytics hasSearch=\{Boolean\(q && country\)\}/);
  assert.match(page, /data-search-provider=\{route.id\}/);
  assert.match(page, /data-search-provider="careers"/);
  assert.match(tracking, /emitProductEvent\("search_submitted", \{ method: "find_get" \}\)/);
  assert.match(tracking, /emitProductEvent\("search_opened_by_source", \{ sourceType: source \}\)/);
  assert.doesNotMatch(tracking, /emitProductEvent\([^\n]*(?:role|country|city|query|href)/);
});
