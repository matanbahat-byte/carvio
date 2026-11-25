import test from "node:test";
import assert from "node:assert/strict";
import { createAnalyticsDelivery, safeAnalyticsStorage } from "../lib/analytics-delivery.ts";
let nextId = 0;
const id = () => `event-${++nextId}`;

test("restricted storage getters and all methods are optional and never throw", () => {
  const denied = safeAnalyticsStorage(() => { throw new Error("SecurityError"); });
  assert.equal(denied.get("session"), null);
  assert.doesNotThrow(() => denied.set("session", "1"));
  assert.doesNotThrow(() => denied.remove("session"));
  const broken = safeAnalyticsStorage(() => ({ getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } }));
  assert.equal(broken.get("session"), null);
  assert.doesNotThrow(() => broken.set("session", "1"));
  assert.doesNotThrow(() => broken.remove("session"));
});

test("rejected send promises resolve safely and retry preserves exact row identity", async () => {
  const calls = [];
  const delivery = createAnalyticsDelivery({ id, send: async (rows) => { calls.push(rows); if (calls.length === 1) throw Error("offline"); return { error: null }; } });
  delivery.setOwner("A");
  delivery.enqueue("job_saved", { email: "private", count: 1 });
  await assert.doesNotReject(delivery.flush());
  await delivery.flush();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0][0].properties, { count: 1 });
  await delivery.flush();
  assert.equal(calls.length, 2);
});

test("unknown and signed-out interactions cannot be reassigned to a later account", async () => {
  const calls = [];
  const delivery = createAnalyticsDelivery({ id, send: async (rows) => { calls.push(rows); return { error: null }; } });
  delivery.enqueue("job_saved");
  delivery.setOwner("A");
  delivery.enqueue("application_created");
  delivery.setOwner(null);
  delivery.setOwner("B");
  delivery.enqueue("application_updated");
  await delivery.flush();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 1);
  assert.equal(calls[0][0].user_id, "B");
  assert.equal(calls[0][0].event_name, "application_updated");
});

test("in-flight A failure cannot restore A events into B queue or acknowledge for B", async () => {
  let finish;
  const calls = [];
  const acknowledged = [];
  const delivery = createAnalyticsDelivery({ id, send: (rows) => { calls.push(rows); return calls.length === 1 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ error: null }); }, acknowledged: (rows) => acknowledged.push(rows) });
  delivery.setOwner("A");
  delivery.enqueue("job_saved");
  const flushing = delivery.flush();
  delivery.setOwner("B");
  delivery.enqueue("application_created");
  finish({ error: new Error("A auth expired") });
  await flushing;
  assert.deepEqual(calls.map(rows => rows.map(row => row.user_id)), [["A"], ["B"]]);
  assert.deepEqual(acknowledged.map(rows => rows[0].user_id), ["B"]);
});

test("overlapping flushes and repeated same-account callbacks do not duplicate batches", async () => {
  let finish;
  const calls = [];
  const delivery = createAnalyticsDelivery({ id, send: (rows) => { calls.push(rows); return new Promise(resolve => { finish = resolve; }); } });
  assert.equal(delivery.setOwner("A"), true);
  delivery.enqueue("job_saved");
  const flushing = delivery.flush();
  assert.equal(delivery.setOwner("A"), false);
  await delivery.flush();
  assert.equal(calls.length, 1);
  finish({ error: null });
  await flushing;
  assert.equal(calls.length, 1);
});

test("server error retains same-account batch; optional callback failures do not reject", async () => {
  let sendCount = 0;
  const delivery = createAnalyticsDelivery({ id, send: async () => ({ error: ++sendCount === 1 ? new Error("retry") : null }), acknowledged: () => { throw Error("storage denied"); } });
  delivery.setOwner("A");
  delivery.enqueue("job_saved");
  await assert.doesNotReject(delivery.flush());
  await assert.doesNotReject(delivery.flush());
  await delivery.flush();
  assert.equal(sendCount, 2);
});


test("unavailable event identifier generation never breaks the underlying interaction", async () => {
  let calls = 0;
  const delivery = createAnalyticsDelivery({ id: () => { throw Error("crypto unavailable"); }, send: async () => { calls++; return { error: null }; } });
  delivery.setOwner("A");
  assert.doesNotThrow(() => delivery.enqueue("job_saved"));
  await delivery.flush();
  assert.equal(calls, 0);
});
