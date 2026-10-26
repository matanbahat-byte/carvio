# CARVIO new-user journey audit — 2026-10-26

Branch: `codex/new-user-journey-audit`. Local changes only; no merge or production deployment.
The registration fixes already in the working tree were preserved and included in this branch.

## Findings and implementation

| # | Result | Verification / remaining limits |
| --- | --- | --- |
| 1. Dates | Original loss of dates was **not reproduced**. A separate calendar defect was reproduced and fixed: a meeting previously hid the action deadline. Calendar now has separate rows for both. Date-only calendar values are interpreted locally and remain upcoming through the end of their day. | Created a fictional role; typed `2026-11-03T10:30` with individual keyboard strokes; added meeting `2026-11-04T11:00`; saved, refreshed, reopened and confirmed both values. Edited meeting day by keyboard to November 5; both action and meeting then appeared in the calendar. Native graphical picker exposed stale/non-actionable nodes to automation: mouse selection is **not fully verified**. Three timezone tests cover local calendar dates; exhaustive DST and all display surfaces are not claimed. |
| 2. First visit / demo | Fresh personal workspace is empty. Removed automatic injection of historical demo records. Added explicit demo entry, persistent demo label and session-storage separation. Demo dates are relative to the day a fresh demo session starts. Demo never mounts CloudAccount. | Existing personal local-storage records are preserved. Demo created and edited test records without enabling cloud sync. `workspace=1` selects workspace display; it does not imply a signed-in user. |
| 3. Account / sync | Replaced contradictory privacy copy with local-first, optional explicit backup/restore and opt-in autosync wording. Callback requires successful session exchange before claiming connection, and failures return to login. Errors are user-facing rather than raw fetch messages. | Prior checks: missing/denied/invalid auth code all redirect to failure with private/no-store headers. Google login worked using an existing browser account. A new user's email delivery + verification remains unverified; no test inbox was supplied. Supabase project had been inactive and was restored before this prompt was adopted; no permissions/schema changes were made. |
| 4. CV states | No extraction failure before a file is selected. Loading, readable text, unreadable text, unsupported format, size limit and extraction error have separate states. Pasted text is visible as a fallback. New uploads clear stale rewrite text. Capability copy reflects text PDFs, DOCX and text; no OCR claim. | Browser verified fictional DOCX and text PDF extraction with matching expected content, empty PDF fallback, distinct corrupt-PDF error and oversized-file feedback. No stale extracted text remained after selecting failed files. Unsupported-extension input is implemented but not yet exercised. |
| 5. Requirements | Extractor combines explicit requirements and relevant responsibilities/tools instead of discarding everything except a signaled sentence. Original source remains unchanged; suggestions are editable and explicitly require checking for omissions. | Exact prompt sample produced four items in browser. Three unit tests cover exact sample, Hebrew semicolons and deduplication/empty input. Rule-based selection remains heuristic, not an exhaustive semantic parser. |
| 6. Search tasks | Create search task opens a dedicated role/location/action/deadline form, without company or fake application. Tasks can be completed/reopened and persist separately; optional JSON backup/cloud payload field retains compatibility. | Saved a fictional search task, refreshed and confirmed persistence. Application count did not change. Tasks currently live in Job Search, not the main application calendar/recommendation engine. Cloud/export roundtrip is not yet exercised. |
| 7. Counts | Unified active/open definition to exclude only Accepted/Rejected/Withdrawn, including Considering consistently. | Reproduced old 0 navigation vs 1 active list for a Considering role. After fix, demo navigation/list/dashboard all reported 8 open roles, including after refresh. Saved roles remain a subset shown separately in Insights. |
| 8. Direct tools | Tools provides role selection for interview preparation and Offer selection for decision briefs. No-role state has an actionable add/review button. A further reproduced issue was fixed: edited decision briefs now autosave inside the selected application's offer details, and the selector retains the role context. Empty edited briefs remain editable. | Chose fictional role directly from Tools; preparation opened with correct context, saved STAR text into role. Chose the Miro demo offer, edited its brief, refreshed, selected it again and verified exact test text persisted. No offer was accepted or declined; those consequential lifecycle transitions were not exercised. |
| 9. Contact validation | Name is visibly required, whitespace rejected, inline error shown and first missing field focused. Role, relationship and next action no longer block saving. Native email format validation remains. | Empty-name submission focused name and showed inline feedback. Name-only fictional contact saved successfully, preserving entered input. |
| 10. Stage vs follow-up | New stage selectors no longer offer Follow-up due. Existing legacy value remains readable/selected for compatibility until a user chooses a real stage. Signal and next action/deadline remain separate. | Saved fictional role as Interview + Waiting with a separate action deadline; no destructive migration. Existing legacy rows remain in their existing columns/filters until edited. |

## Checks performed

- `npm test`: six regression tests (requirements and schedule).
- `npm run build`: compilation and TypeScript.
- `npm run lint` and `git diff --check`.
- Browser: local desktop 1280×720 and Hebrew RTL 390×844; demo marker, calendar, empty CV, Tools interview selector, saved preparation, Mark done, name-only contact, search task and refresh.
- Mark done cleared the action/deadline while retaining interview stage and meeting.

## Data model and storage

- No database schema, RLS, permission or infrastructure edits in this audit branch.
- Search tasks use `carvio.search-tasks.v1`; backup payload adds optional `searchTasks` without removing old fields.
- Resume metadata adds optional `readState` and remains compatible with existing saved versions.
- Offer details add optional `decisionBrief` and `decisionBriefUpdatedAt`; older records still generate a brief normally. Edits are persisted by the existing workspace storage/backup path, not a new database table.
- Demo uses browser session storage; personal workspace continues using its existing local-storage keys. Leaving demo reloads the app to prevent in-memory mixing.
- Legacy Follow-up due is retained; no inferred stage migration.

## Evidence

Screenshots are saved locally under `/tmp/carvio-audit-*.jpg`. They contain fictional demo data. The final handoff links the current evidence; temporary screenshots should be copied elsewhere if long-term retention is needed.

## Still open before declaring the complete prompt finished

Actual new-account email verification; manual graphical picker check; unsupported-file fixture; accept/decline offer lifecycle; backup roundtrip for search tasks; full regression of URL capture, message drafts, Kanban and responsive forms. These are not silently treated as passing just because the build succeeds.

## Follow-up validation — 2026-10-26

`scripts/create-cv-fixtures.mjs` generates disposable fictional DOCX, PDF and error-case files in the OS temporary directory. Browser tests use only the isolated demo workspace; no original CVs or personal records are used. After the offer-brief fix, the production build, lint and diff checks passed. Current additional screenshots: `/tmp/carvio-audit-cv-errors.jpg` and `/tmp/carvio-audit-offer-saved.jpg`.
