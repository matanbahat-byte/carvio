import test from "node:test";
import assert from "node:assert/strict";
import { reviewResumeText, cleanResumeDraft } from "../lib/resume-review.ts";
test("existing skills, bullets and numbers are acknowledged in either interface language", () => {
  const cv = "Skills: SQL, Excel\n• Reduced costs by 20%\n• Supported 12 employees";
  const en = reviewResumeText(cv, "en").join(" ");
  const he = reviewResumeText(cv, "he").join(" ");
  assert.match(en, /Skills or expertise wording detected/);
  assert.match(en, /Bullet lines detected/);
  assert.match(en, /Numbers detected/);
  assert.match(he, /כישורים/);
  assert.match(he, /מספרים/);
  assert.equal(cleanResumeDraft(cv), cv);
});
test("Hebrew source and responsibility wording are preserved", () => {
  const cv = "כישורים: אקסל\n• סייעתי לצוות של 12 עובדים\n\n\nניסיון";
  assert.match(reviewResumeText(cv, "en").join(" "), /Skills or expertise wording detected/);
  assert.equal(cleanResumeDraft(cv), cv.replace("\n\n\n", "\n\n"));
  assert.equal(cleanResumeDraft("Responsible for sales\nHelped 3 teams"), "Responsible for sales\nHelped 3 teams");
});
test("unrecognized markers do not establish missing achievements", () => {
  assert.match(reviewResumeText("Managed sales", "en").join(" "), /does not establish/);
});
