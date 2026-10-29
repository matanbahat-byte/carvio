# Search → capture → first action — 2026-10-29

Local-only usability follow-up.

- Search results explain the concrete handoff: copy the listing URL from LinkedIn and return to save it.
- After successful quick capture, Search opens the exact saved application instead of asking for the URL again. The latest captured application ID is kept independently from the dismissed capture dialog. If that record no longer exists, navigation falls back to Applications.
- Success confirmation shows the actual next action and optional deadline, rather than generic workspace promises. Blank action has a neutral optional-action message.
- The copy/paste instructions are hidden after successful capture.

Validation: 18 existing automated tests pass; ESLint and production build pass. Hebrew mobile demo: prepared search, captured an example.com fictional listing, edited its action, saved, dismissed confirmation, then opened the exact new application from Search. Workspace showed the expected role/company and action. Screenshot: `/tmp/carvio-handoff-workspace.jpg`.

No personal workspace writes, external application submission, authentication changes or publication. Actual LinkedIn result precision remains controlled by LinkedIn, not verified by this UI handoff test.

## Extended capture follow-up

Reproduced an inconsistency: choosing More details and saving through the full form left Search in the unsaved state. Both quick and extended capture now share the same completion handler (saved record, success confirmation, next action and exact-record navigation). Editing an existing record does not trigger new-capture confirmation.

Rebuilt and tested in English at 1280×900: capture → More details → Add application → Job saved → Not now → Open saved job. Correct fictional role/company and next action appeared in the workspace. Viewport reset afterwards. All 18 tests, ESLint and production build passed. Screenshot: `/tmp/carvio-expanded-save-success.jpg`.

## Edge checks

Browser demo checks: invalid URL shows an inline error; missing role/company blocks saving; editing an existing captured record shows the normal update notice rather than a new-capture success screen.

Reproduced two simultaneous dialogs when a new captured role was saved as Rejected through More details (capture success plus Reset). New captures now finish with the capture confirmation only. Existing edit/manual rejection workflows retain their Reset handling. No saved data or recovery entries are deleted.

After rebuild, repeated the rejected-capture flow: exactly one dialog was present, showing Job saved for the expected fictional record. Screenshot: `/tmp/carvio-capture-single-dialog.jpg`. All 18 tests, ESLint and build passed again.
