import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGuestEvent } from "../lib/guest-analytics.ts";
const id = "12345678-1234-4234-8234-123456789abc";
test("guest events discard private fields and account identifiers", () => {
  assert.deepEqual(validateGuestEvent({id,eventName:"search_submitted",query:"private",user_id:"other"}),{id,eventName:"search_submitted"});
});
test("reject unknown events, invalid identifiers and arbitrary source text", () => {
  assert.equal(validateGuestEvent({id,eventName:"job_opened"}),null);
  assert.equal(validateGuestEvent({id:"bad",eventName:"guest_visit"}),null);
  assert.equal(validateGuestEvent({id,eventName:"search_opened_by_source",sourceType:"private URL"}),null);
  assert.deepEqual(validateGuestEvent({id,eventName:"search_opened_by_source",sourceType:"linkedin"}),{id,eventName:"search_opened_by_source",sourceType:"linkedin"});
});
