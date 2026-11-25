import test from "node:test";
import assert from "node:assert/strict";
import { createCloudSaveReplay } from "../lib/cloud-save-replay.ts";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("edit whose debounce expires during a slow write is replayed once after acknowledgement", async () => {
  const replay = createCloudSaveReplay();
  const first = { applications: ["first"] };
  const latest = { applications: ["first", "latest"] };
  const request = deferred();
  replay.observe(first);
  const token = replay.begin(first);
  const saving = request.promise.then(() => replay.finish(token, true));
  // Simulate multiple edits and their debounce firing while operationRef is held.
  replay.observe({ applications: ["intermediate"] });
  replay.observe(latest);
  request.resolve();
  assert.equal(await saving, true);
  const next = replay.begin(latest);
  assert.equal(replay.finish(next, true), false);
  assert.equal(replay.observe(latest), false, "successful completion must not reschedule itself");
  assert.equal(replay.observe({ applications: ["first", "latest"] }), false, "parent status rerenders must not cause a save loop");
});

test("network/conflict failure does not automatically replay pending edits", async () => {
  const replay = createCloudSaveReplay();
  const request = deferred();
  const token = replay.begin("old");
  const saving = request.promise.then(() => replay.finish(token, false));
  replay.observe("latest");
  request.resolve();
  assert.equal(await saving, false);
});

test("toggle off, account transition or unmount cancels pending replay and invalidates completion", async () => {
  for (const reason of ["toggle", "account", "unmount"]) {
    const replay = createCloudSaveReplay();
    const request = deferred();
    const token = replay.begin("old");
    const saving = request.promise.then(() => replay.finish(token, true));
    replay.observe("latest");
    replay.reset();
    assert.equal(replay.isCurrent(token), false, reason);
    request.resolve();
    assert.equal(await saving, false, reason);
  }
});

test("old account completion cannot acknowledge or discard a new account's pending work", () => {
  const replay = createCloudSaveReplay();
  const old = replay.begin("old account");
  replay.reset();
  replay.observe("new account");
  assert.equal(replay.finish(old, false), true);
  assert.equal(replay.observe("new account"), true);
  const next = replay.begin("new account");
  assert.equal(replay.finish(next, true), false);
});

test("reverting to the prior acknowledged snapshot while a different write runs is replayed", () => {
  const replay = createCloudSaveReplay();
  const original = replay.begin("original");
  replay.finish(original, true);
  replay.observe("edit");
  const writing = replay.begin("edit");
  assert.equal(replay.observe("original"), false);
  assert.equal(replay.finish(writing, true), true);
  const reverting = replay.begin("original");
  assert.equal(replay.finish(reverting, true), false);
});
