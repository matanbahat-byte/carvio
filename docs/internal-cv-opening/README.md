# Internal CV opener blocked-tab diagnosis

Baseline production/main: d77282b87cb225438a206721c87e42574a96a7a3. Fresh guest browser contexts, Hebrew, 390px and1366px, a saved text CV not linked to the application, extracted requirements, and an empty/nonempty current CV draft. No customer account or stored customer records were used.

Observed before changing code:

- With an empty current draft, the internal Tailor CV to requirements opened the correct application in the CV lab normally on both viewports.
- With an existing draft, it emitted a native `confirm` asking to replace the draft. A page-JavaScript heartbeat did not complete while that prompt was open. Dismissing it restored responsiveness and left the application modal open and the draft unchanged.
- The prominent contextual CV button then opened the correct application without prompting or replacing the draft.

Raw observations: production-before.jsonl. This establishes native-dialog blocking on the internal route, not a CPU loop/crash or a permanent hang after dismissing the prompt. The reporter's exact prior tab state is unavailable; the additional triggering condition found was a nonempty current draft.

Cause: the internal button called `openCvSupport(application)`; its default invokes `replaceRewriteDraft("")` before navigation. The already-working prominent button passes `true` to preserve the draft.

Product change: one event-handler argument, calling that same existing opener with `true`. No new opener, generation logic, content transformation, requirements extraction, hashtags, AI, storage schema, data reset or deletion. Explicit clean-draft generation and restore still retain their existing confirmation/backup behavior.

Regression coverage: tests/internal-cv-opening-browser.mjs uses actual guest/localStorage contexts, Hebrew/English,390px/1366px, linked/unlinked CVs, two applications with three internal opens each, prominent-button checks, no native prompts or page errors, exact application/resume/draft/previous-copy preservation, and edited-draft refresh/reopen. Existing recovery tests now test explicit generation/replacement rather than expecting navigation to clear the draft. Existing contextual-tool tests remain unchanged.

Release checks are tracked on the PR. No production deployment is implied by the baseline diagnosis.
