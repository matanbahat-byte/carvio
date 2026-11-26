import test from "node:test";
import assert from "node:assert/strict";
import { createAccountSession } from "../lib/analytics-account-session.ts";
function fixture() {
  const map = new Map();
  let n = 0;
  const storage = { get: k => map.get(k) ?? null, set: (k,v) => map.set(k,v), remove: k => map.delete(k) };
  return { make: () => createAccountSession(storage, () => String(++n)) };
}
test("same account callback and reload preserve session", () => {
  const {make} = fixture(); const a = make(); const id = a.setOwner("A");
  assert.equal(a.setOwner("A"), id);
  assert.equal(make().setOwner("A"), id);
});
test("account switch and sign-out rotate session IDs", () => {
  const {make} = fixture(); const a = make(); const first = a.setOwner("A");
  const second = a.setOwner("B"); assert.notEqual(first, second);
  assert.notEqual(a.setOwner(null), second);
  assert.notEqual(a.setOwner("A"), first);
  assert.notEqual(a.setOwner("B"), second);
});
test("anonymous identity is not reused for authenticated account", () => {
  const {make} = fixture(); const a = make(); const anonymous = a.id;
  assert.notEqual(a.setOwner("A"), anonymous);
});
test("redirect/reload account switches cannot revive the previous account session", () => {
  const {make}=fixture();const first=make().setOwner('A');make().setOwner('B');assert.notEqual(make().setOwner('A'),first);
});
test("signed-out reload invalidates the previous authenticated session", () => {
  const {make}=fixture();const first=make().setOwner('A');make().setOwner(null);assert.notEqual(make().setOwner('A'),first);
});
