# Preference and quick-capture audit — 2026-10-28

Local-only follow-up to search trust/usability work.

- Role edits now preserve skills, seniority, industry and exclusions. A short bilingual review notice appears when retained filters came from another role. Running a search acknowledges the selected preferences.
- Migration/reload no longer deletes legacy preferences when role provenance is absent or different.
- Quick link capture exposes optional next action and deadline after the essential role/company/location/stage fields. No additional required fields or invented job metadata.
- Added regression coverage for role edit, legacy migration, reload and preference-review acknowledgement.
- 18 tests pass; ESLint and production build pass.
- Browser demo verified retained skills and industry, with review notice persisting after refresh. Initial date-entry test exposed missing date capture; input handling was adjusted. After rebuilding, a fictional capture retained its next action and Oct 30, 2026 10:30 deadline after save and reload. Mobile screenshots: `/tmp/carvio-capture-action-review.jpg` and `/tmp/carvio-capture-action-persisted.jpg`.

No production publication, database/auth changes or personal record edits. LinkedIn can still alter or broaden outgoing search filters; this work does not guarantee source result precision.
