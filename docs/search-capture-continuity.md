# Search → capture → first action — 2026-10-29

Local-only usability follow-up.

- Search results explain the concrete handoff: copy the listing URL from LinkedIn and return to save it.
- After successful quick capture, Search opens the exact saved application instead of asking for the URL again. The latest captured application ID is kept independently from the dismissed capture dialog. If that record no longer exists, navigation falls back to Applications.
- Success confirmation shows the actual next action and optional deadline, rather than generic workspace promises. Blank action has a neutral optional-action message.
- The copy/paste instructions are hidden after successful capture.

Validation: 18 existing automated tests pass; ESLint and production build pass. Hebrew mobile demo: prepared search, captured an example.com fictional listing, edited its action, saved, dismissed confirmation, then opened the exact new application from Search. Workspace showed the expected role/company and action. Screenshot: `/tmp/carvio-handoff-workspace.jpg`.

No personal workspace writes, external application submission, authentication changes or publication. Actual LinkedIn result precision remains controlled by LinkedIn, not verified by this UI handoff test.
