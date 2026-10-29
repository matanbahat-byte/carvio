# First value home audit — 2026-10-29

Local-only scope; no registration/email, auth or database changes.

Observed a fresh `localhost:3025/?workspace=1` origin with zero applications and contacts, no demo fixtures, no selected usage intent. It showed an empty attention panel and zero-count progress before the first task.

Changes:
- Hide attention/progress panels while both application and contact collections are empty; retain existing panels as soon as either has data.
- Explain the value of saving an opportunity and that only company/role are required to begin.
- Fixed a second reproduced gap: a newly entered action without a deadline was ignored by home recommendations. Active undated actions now have a low-priority, non-urgent recommendation (below meetings, due work, planning/contact gaps). Closed applications are excluded. No deadline is invented.

Checks: empty home has one primary task and optional intent selector, no fake jobs/interviews. Added one explicitly fictional TEST ONLY company/role/action in the isolated local workspace, reloaded and verified the saved action is the headline. Hebrew mobile 390×844 verified. Screenshot `/tmp/carvio-first-use-empty.jpg`, `/tmp/carvio-first-action-he-mobile.jpg`. Viewport restored. 18 tests and production build passed; ESLint also run.

Limits: real email/signup and cloud restore remain unverified; this is a browser-local first-value check, not a successful account-registration claim. No public deployment.
