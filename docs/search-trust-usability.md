# Search trust and usability — 2026-10-27

Branch: `codex/search-trust-usability`. Local implementation only; no merge, push or production deployment.
Input: the attached implementation prompt. The linked ChatGPT Library report was not downloaded or represented as read. The ten personas are one tester's simulation, not ten research participants.

## Implemented findings

| Prompt area | Verification and implementation |
| --- | --- |
| A. Filter transparency | Confirmed that LinkedIn silently omitted skills and industry. Each generated source now includes requested/sent and explicitly unapplied preferences. Industry is not invented as a LinkedIn industry ID. Skills default to preferences, not query constraints. An explicit checkbox adds all selected/typed skills with AND, with a narrowing warning. LinkedIn filter receipt/enforcement is **not** guaranteed. |
| B. Accuracy promises | Removed exact-match/protected-location promises from active search UI. Role phrases and existing HR title aliases are visible in request details; no new hidden title expansion or exclusions. Removed implicit Controller exclusions from HR searches. Copy distinguishes the sent request from source ranking and location behavior. No source result counts or match scores are imported or manufactured. |
| C. Stale links | Any change to the sanitized profile hides old source links and outcome actions. User must update the search. Browser verified that changing Hybrid produced zero old LinkedIn links, then updating produced a new link with f_WT=3. Search-task creation and broadening now use the current draft, not an obsolete submitted snapshot. |
| D. State/timing | Existing submission already froze a sanitized snapshot, and country changes already cleared city; preserved both behaviors. Extracted functional patch helper and skill toggle to avoid relying on an older closure. No debounce or destructive storage rewrite added. Rapid synchronous role/country/city edits worked in the sampled browser run; the reported human-use stale-state bug was not independently reproduced. |
| E. Role skills | Added software, nursing, teaching, store management, data analysis, graphic design, accounting and electrician families, including common Hebrew names. Existing HR/supply-chain families retained. Unknown roles return no fake tailored suggestions and display a manual-entry fallback. Suggestions are curated examples, not inferred qualifications. |
| F. Time window | Fresh profiles start with a week. Existing explicit saved 24-hour choices remain. Selected time stays visible even with extra filters collapsed. Repeat-scan button explicitly changes to 24 hours; it does not rerun or silently broaden anything. Broadening changes one filter only and preserves role/skills/exclusions. |
| G. Capture shortcut | Results → Save a job from a link opens capture directly, eliminating the intermediate found-job acknowledgment. Review still precedes saving. URLs are restricted to HTTP(S), retained exactly after URL normalization, and provider hosts are checked rather than matched by arbitrary substring. Company/title are left blank for manual completion instead of guessed from slugs/domains; pasted description/requirements remain editable. Unknown hosts are categorized Other. |
| H. Usage intent | Optional and skippable four-way choice in an empty dashboard and Settings. For an empty workspace, the existing primary recommendation/CTA adapts to networking, market exploration, active search or career improvement. There is one primary CTA, not an added competing action. Existing records and their recommendations are not overridden. Choice persists via the existing optional userProfile field/backup path. |
| I. Accessibility/validation | New copy is bilingual using the existing language mechanism. Required company/role labels are explicit, errors appear adjacent with aria-invalid/describedby and alerts; missing-field focus is retained. Next action is explicitly optional so saving a real opportunity does not require inventing a task. Captured listings get an editable default review action. Keyboard Tab/Enter opened the filter summary. RTL desktop and 390px mobile were inspected; measured document scroll width equaled viewport width (390px). |

## External-source validation: important limit

A generated Hebrew Electrician / Beer Sheva link was actually opened in LinkedIn. Initial URL included the quoted role, Beer Sheva + Israel, distance, past-week, full-time and hybrid parameters. The existing browser session transitioned to LinkedIn's search-results experience; the resulting URL retained keywords and time but did not retain several other parameters. The UI displayed Location Israel and broad results (including a System Engineer and jobs in other cities).

This is evidence that a correctly generated link is **not proof** that LinkedIn enforces it. External result precision and city/work-model enforcement are **not passing acceptance checks**. Cause (account UI, source changes, personalization, etc.) was not established. The UI now warns users to check and reselect location/employment filters at the source. No guessed geoId, unsupported parameter, scraping engine or paid service was added. The account was not modified, no alert enabled, and no job saved/applied to on LinkedIn.

Reference documentation consulted:
- https://www.linkedin.com/help/linkedin/answer/a507441/filter-and-sort-job-search-results
- https://www.linkedin.com/help/linkedin/answer/a524335

These document source UI filters/Boolean syntax, not a guaranteed public URL API contract.

## Tests and observed outcomes

- `npm test`: 17 passing tests (11 new search regressions + six existing requirements/schedule tests).
- `npm run build`: production compilation, TypeScript and static generation passed.
- Targeted ESLint on `app/page.tsx` and `lib/job-search.ts`; `git diff --check`.
- Automated link tests cover skills modes, unapplied industry, every changed profile field, country→city sequencing, 24h→week preservation, Hebrew encoding, contract/internship/part-time/temporary/full-time, remote/hybrid/on-site, all requested role families, and safe capture URLs.
- Browser: entered Software Engineer, Israel / Beer Sheva, Healthcare, Python/SQL and exclusions. Omitted preferences appeared before opening; explicit skills requirement updated the actual link. Hybrid edit hid old link; explicit update recreated it with new parameters.
- Browser: direct capture left company/role blank, blocked empty save, accepted manually entered fictional data, showed the saved opportunity with its review action and retained it after refresh. No real listing was scraped or asserted as verified.
- Browser: empty local workspace had zero jobs/interviews; networking intent changed the main recommendation to Add a contact, opened the contact form, and remained after refresh. Demo intent was also editable in Settings without changing the application count.
- Browser: empty Add application showed inline Hebrew errors and focused Company. Keyboard navigation opened request details. Desktop Hebrew + mobile English/Hebrew inspected. Full cross-browser/assistive-technology coverage is not claimed.

## Storage / scope

No database, auth, RLS, infrastructure, paid provider or migration changes. Existing search profiles retain old choices; optional skillsMode and lastSearchedAt are backward compatible. Optional usageIntent is stored with existing userProfile. No personal records were edited. Tests used isolated demo data and a fresh, empty loopback origin. The existing disabled company-lead/sample-score UI was not enabled or used.

## Remaining priorities

1. Reliable source-side city/work-model enforcement needs a supported source integration or a user-guided filter check. Do not call the current link handoff equivalent to native LinkedIn search.
2. Industry IDs, work authorization, working language and worldwide remote eligibility remain unsupported; do not fabricate filters. The nonfunctional Other-country choice is no longer offered for new searches; existing Other profiles must choose a supported country before launching.
3. Validate actual user comprehension with real participants, especially preference versus mandatory skills and the external-source warning.
4. Expand role aliases/skill vocabularies based on observed use, not generic claims of tailoring. Unknown roles keep manual entry.
5. Cloud roundtrip for the new optional intent/search fields, full cross-browser keyboard/reader testing, email verification and all external-source result behavior remain outside the verified set.

## Review locally

`npm test`, then `npm run build`, then `npm start -- --port 3025`.
Demo: http://127.0.0.1:3025/?workspace=1&demo=1
First-use empty workspace: http://127.0.0.1:3025/?workspace=1 (separate from demo; do not use a personal production account for fixture testing).
Screenshots: `/tmp/carvio-search-trust-final-desktop.jpg`, `/tmp/carvio-search-trust-mobile-he.jpg`, `/tmp/carvio-search-validation-he.jpg`, `/tmp/carvio-search-intent-empty.jpg`.
