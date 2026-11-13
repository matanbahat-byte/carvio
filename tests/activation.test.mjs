import assert from "node:assert/strict";
import test from "node:test";

import { firstJobDecisionComplete, nextActionDueTomorrow } from "../lib/activation.ts";

test("first job decision defaults to tomorrow at 10:00 local time", () => {
  assert.equal(nextActionDueTomorrow(new Date(2026, 10, 13, 22, 30)), "2026-11-14T10:00");
});

test("first job decision requires a real opportunity and a scheduled next move", () => {
  assert.equal(firstJobDecisionComplete({ role: "Designer", company: "Northstar", nextStep: "Review requirements", nextStepDue: "2026-11-14T10:00" }), true);
  assert.equal(firstJobDecisionComplete({ role: "Designer", company: "Northstar", nextStep: "", nextStepDue: "2026-11-14T10:00" }), false);
  assert.equal(firstJobDecisionComplete({ role: "Designer", company: "Northstar", nextStep: "Review requirements", nextStepDue: "" }), false);
});
