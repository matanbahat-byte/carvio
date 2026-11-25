import test from "node:test";
import assert from "node:assert/strict";
import { productIntelligence, isMeaningfulJobSearchEvent } from "../lib/product-intelligence.ts";
const context = { environment: "production", actorKind: "user" };
const event = (id, userId, occurredAt, name = "application_created", extra = {}) => ({ ...context, id, userId, occurredAt, name, ...extra });
const registration = (userId, registeredAt, extra = {}) => ({ ...context, userId, registeredAt, ...extra });
const asOf = "2026-11-25T10:00:00Z";

test("North Star counts unique meaningful users, excluding telemetry, internal traffic, duplicates and future events", () => {
  const events = [
    event("a", "real", "2026-11-24T10:00:00Z"),
    event("a", "real", "2026-11-24T10:00:00Z"),
    event("b", "real", "2026-11-24T10:00:00Z", "job_saved"),
    event("c", "passive", "2026-11-24T10:00:00Z", "session_heartbeat"),
    event("d", "passive", "2026-11-24T10:00:00Z", "screen_viewed"),
    event("e", "internal", "2026-11-24T10:00:00Z", "job_saved", { actorKind: "internal" }),
    event("f", "preview", "2026-11-24T10:00:00Z", "job_saved", { environment: "preview" }),
    event("g", "automation", "2026-11-24T10:00:00Z", "job_saved", { actorKind: "automated" }),
    event("h", "known-test", "2026-11-24T10:00:00Z"),
    event("i", "old", "2026-11-18T09:59:59Z"),
    event("j", "future", "2026-11-25T10:00:00Z"),
    event("k", "unknown", "2026-11-24T10:00:00Z", "job_saved", { environment: undefined }),
  ];
  const result = productIntelligence({ events, registrations: [], asOf, excludedUserIds: ["known-test"] });
  assert.equal(result.weeklyMeaningfullyActiveJobSeekers, 1);
  assert.equal(result.dataQuality.rejectedEvents, 7);
  assert.ok(!JSON.stringify(result).includes("known-test"));
});

test("only completed search with confirmed usable result qualifies; shortcuts/submissions do not", () => {
  for (const name of ["search_submitted", "search_sources_presented", "search_opened_by_source", "search_completed"]) {
    assert.equal(isMeaningfulJobSearchEvent({ name }), false);
  }
  assert.equal(isMeaningfulJobSearchEvent({ name: "search_completed", properties: { usableResult: true } }), true);
  assert.equal(isMeaningfulJobSearchEvent({ name: "search_completed", properties: { usableResult: "true" } }), false);
});

test("D1/D3/D7 exclude incomplete observation windows and count meaningful activity only", () => {
  const registrations = [registration("mature", "2026-11-17T10:00:00Z"), registration("new", "2026-11-24T10:00:01Z")];
  const events = [event("1", "mature", "2026-11-18T10:00:00Z"), event("2", "mature", "2026-11-20T10:00:00Z"), event("3", "mature", "2026-11-24T10:00:00Z", "session_heartbeat")];
  const result = productIntelligence({ events, registrations, asOf });
  assert.deepEqual(result.retention, [{ day: 1, eligible: 1, retained: 1, rate: 1 }, { day: 3, eligible: 1, retained: 1, rate: 1 }, { day: 7, eligible: 1, retained: 0, rate: 0 }]);
});

test("retention intervals are half-open and eligibility requires the entire interval", () => {
  const registrations = [registration("one", "2026-11-23T10:00:00Z"), registration("not-yet", "2026-11-23T10:00:00.001Z")];
  const result = productIntelligence({ registrations, events: [event("edge", "one", asOf)], asOf });
  assert.deepEqual(result.retention[0], { day: 1, eligible: 1, retained: 0, rate: 0 });
});

test("unavailable data differs from verified zero and no eligible cohort has no rate", () => {
  const unavailable = productIntelligence({ events: null, registrations: null, asOf });
  assert.equal(unavailable.weeklyMeaningfullyActiveJobSeekers, null);
  assert.deepEqual(unavailable.retention[0], { day: 1, eligible: null, retained: null, rate: null });
  const empty = productIntelligence({ events: [], registrations: [], asOf });
  assert.equal(empty.weeklyMeaningfullyActiveJobSeekers, 0);
  assert.deepEqual(empty.retention[0], { day: 1, eligible: 0, retained: 0, rate: null });
});

test("invalid and anonymous identities cannot create registered-user retention", () => {
  const result = productIntelligence({ events: [event("bad", null, "2026-11-24T10:00:00Z"), event("time", "user", "invalid")], registrations: [registration("user", "invalid"), registration("test", "2026-11-10T10:00:00Z", { environment: "test" })], asOf });
  assert.equal(result.weeklyMeaningfullyActiveJobSeekers, 0);
  assert.equal(result.dataQuality.rejectedEvents, 2);
  assert.equal(result.dataQuality.rejectedRegistrations, 2);
  assert.throws(() => productIntelligence({ events: [], registrations: [], asOf: "invalid" }), RangeError);
});
