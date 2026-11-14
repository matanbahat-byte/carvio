import test from "node:test";
import assert from "node:assert/strict";
import { completionLoopOptions } from "../lib/completion-loop.ts";

test("completion options follow the application stage without inventing progress", () => {
  assert.deepEqual(completionLoopOptions("Considering", "en"), [
    "Tailor the CV",
    "Decide whether to apply",
    "Find a contact at the company",
  ]);
  assert.equal(completionLoopOptions("Applied", "en")[0], "Send a follow-up");
  assert.equal(completionLoopOptions("Interview", "en")[0], "Send a thank-you note");
  assert.equal(completionLoopOptions("Offer", "en")[0], "Review the offer terms");
});

test("completion options are available in Hebrew", () => {
  assert.equal(completionLoopOptions("Applied", "he")[0], "שליחת הודעת מעקב");
  assert.equal(completionLoopOptions("Interview", "he")[1], "הכנה לראיון הבא");
});
