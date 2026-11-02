# Decision-support implementation — 2026-10-30

## Baseline / architecture

Starting branch was `codex/first-value-home`, clean, with one unpublished first-home commit; preserved. Baseline: 18 tests passed. UI, application/contact models and state were predominantly in `app/page.tsx`. Navigation uses local active-view/tool state and URL landing/workspace flags, not per-module server routes. Local storage uses existing keys; explicit demo uses separate session storage. Backup/restore uses the same normalizers as hydration. No new backend, dependencies, paid API or AI model.

## Implemented phases

1. Added pure goal/source/message helpers and tests in `lib/decision-support.ts`.
2. Canonical goal values with legacy migration on hydrate/restore (`active`, `improving`, `market`, `networking`, `skip` preserved semantically). Goal-specific primary CTAs, accessible Change goal, settings, short feedback. Better-role target/non-negotiables stored in profile without changing search filters. Existing urgent work remains prioritized.
3. Two visible external search routes (LinkedIn and Google broader sources); optional career-page discovery. No scraping or verified-result claims. Capture source is editable. `sourceType`/`sourceUrl` migrate without dropping original source text; existing status preserved. Source outcome counts and interview rates (minimum 5 submitted, explicit numerator/denominator) behind disclosure in Insights.
4. Message context stores explicit contact/application IDs. Contact entry no longer auto-selects a company-name match. Explicit draft/application selector. Existing-contact link/unlink and CV-version links in application details; unlink does not delete records. Contact edits remove the old singular relationship before adding the new one.
5. Message generation requires a personal anchor, uses standalone value sentences, offers trust card identifying local templates and unverified claims, never auto-sends. Local draft created/edited/copied and follow-up events. Analytics property whitelist removes company/email/content from new event payloads.
6. Extracted deterministic ranking to `lib/recommendations.ts` with supplied clock, tie-breaks, closed-state exclusions, bounded one primary + up to three secondary actions, explicit networking-action priority and optional dismiss reason. Dismissed exact action/label does not suppress changed future tasks.
7. Optional structured responsible-AI evidence form in application details and CV Lab. Requires task/tool/human judgment/outcome and explicitly selected requirement IDs. Editable preview, no invented claims/numbers. Application evidence items store IDs and may link to several requirements. Legacy inline evidence remains supported.

## Verification / remaining work

Automated tests cover five goals/legacy values, source migration and outcome denominator, safe URLs, context-link ID helpers, template tones and grammar, anchorless drafts, privacy properties, AI evidence, ranking determinism/closed stages/overdue/dismiss/networking. Browser verification is recorded below when completed.

8. Added goal-specific progress summaries, named tracking/decision/tailoring/interview prerequisites, and replaced displayed offer/interview readiness percentages with checklist labels. Added local activation/session and seven-day return calculations with explicit denominators and incomplete-window states; no claim of observed seven-day retention.
9. Local backup restore preflights known record fields before confirmation or writes; missing legacy fields remain supported. Added real server-rendered goal-picker component coverage for five goals in both languages. Requirement merging now remaps evidence links to the retained requirement ID.

### Verified on 2026-10-31

- 38 automated tests, targeted ESLint, production build and diff whitespace checks pass after the final copy/link corrections.
- Isolated local fictional journey: new opportunity defaults to Considering; manually set Applied; edited source; saved structured evidence against an explicit requirement; linked a fictional contact; blocked an anchorless message and generated an anchored editable draft with trust card; inspected source counts with the small-sample rate withheld.
- Isolated local restore: malformed company value rejected without changing the empty workspace. Legacy Applied status and original unknown source text preserved; old networking intent migrated to networking_focus.
- No personal production records modified and no public deployment.
- Final build loaded successfully in the isolated fictional workspace in Hebrew. Screenshot `/tmp/carvio-decision-support-mobile-he.jpg` is actually desktop-width: the requested viewport override did not produce a narrow screenshot, so it is not mobile-verification evidence.
- Subsequent focused check after approval: reloaded with a 390×844 viewport, verified innerWidth/body scrollWidth both 390, inspected Hebrew dark-mode layout, Tab focus, Enter opening application workspace, and Escape closing the dialog. Screenshot `/tmp/carvio-final-mobile-dark.jpg`. Restored light mode and default viewport. This is focused coverage, not a complete accessibility audit.

### Remaining verification / limitations

### Explicit recipient identity — 2026-11-02

Removed name-only lookup from application outreach and thank-you entry points. A shared selector respects ordered explicit contact IDs; if absent, only one unambiguous reverse application-ID link is accepted. Multiple reverse candidates never choose arbitrarily. Legacy free-text names remain usable but do not borrow email/role from same-name contacts. Linked contact name takes precedence over stale free text to avoid name/email mismatch. Three regression tests cover same-name contacts, contact order, removed links, and ambiguous reverse links (56 total). Tests/build passed. Local browser check confirmed the existing explicit contact still prefilled its saved name/role; empty saved email remained empty. Screenshot `/tmp/carvio-explicit-recipient-check.jpg`. Duplicate-name/thank-you branches covered by shared-selector tests, not a separate full browser journey. No public deployment.

### Shared evidence in outreach — 2026-11-02

Found two remaining inline-only evidence selectors in Message Studio entry points. Application outreach and contact outreach with an explicitly linked application now use one shared pure evidence selector that resolves structured IDs and preserves legacy notes. Missing/deleted/unlinked/cross-application evidence is not inferred. Added two tests (53 total), build passed. Local Hebrew browser check confirmed the supplied evidence is prefilled in the relevant-value field when opening outreach from the application; screenshot `/tmp/carvio-shared-evidence-outreach.jpg`. The contact-specific browser path and interview-preparation field behavior were not expanded in this pass; interview notes remain user-entered. No public deployment.

### Generation-time message transparency — 2026-11-02

Replaced the generic trust-card input claim with a generation-time snapshot of template inputs. Lists only nonempty content fields and template controls actually consulted (recipient type excluded for thank-you). Email, contact role and relationship are not falsely listed as body-generation inputs. Snapshot stays in component memory, never analytics. Changed form inputs/language produce a stale-draft warning; manual subject/body edits are separately disclosed and never silently overwritten by form changes. Explicit regeneration resets the snapshot and edit notice. Added pure/SSR bilingual tests (51 total). Production build passed. Local Hebrew browser verification: blank sender/context absent from the list; manual subject/body remained byte-for-byte unchanged after company edit; warning appeared; explicit regeneration used the new company and cleared stale/edit notices. Screenshot `/tmp/carvio-message-provenance-verified.jpg`. No public deployment.

### CV context and stable requirement IDs — 2026-11-02

Completed the CV Lab navigation check. Found two defects: CV tailoring context ignored structured evidence links, and hydration's requirement sanitization discarded saved IDs before synchronization, orphaning links after reload. CV context now resolves explicit evidence links; restoration retains valid rows and their IDs/categories. Legacy notes remain supported, missing evidence remains an explicit gap, cross-application links do not leak into drafts. Added three tests (49 total). Final build and tests passed. Local Hebrew journey: saved a fictional test link from CV Lab, reloaded, observed the 2/2 evidence display in Application Workspace, reopened CV tailoring and verified linked evidence in the generated context. Screenshot `/tmp/carvio-cv-linked-evidence-verified.jpg`. Old already-orphaned links are not guessed or auto-repaired; users explicitly select their intended requirement in the editor. No public deployment.

### Reusable evidence links — 2026-11-01

Added an optional saved-evidence links editor in Application Workspace and CV Lab. Users explicitly select multiple active requirement IDs, save or unlink all without deleting evidence/legacy notes. Links are constrained to the evidence's owning application, deduplicated and filtered against available requirements; unknown old IDs are shown as unavailable and removed only on save. Pure display projection resolves shared evidence without persisting additional text copies, and readiness/map consume that projection. Legacy inline notes remain independent and are deliberately not deleted by unlinking structured evidence. Removed the prominent percentage from the requirements/evidence display in favor of a numerator/denominator with a relevance caveat. Four additional regression tests (46 total); final build/UI verification follows below. No dependencies, AI service, backend, or public deployment added.

Verified final build: 46 tests and production build passed. Local Hebrew browser journey linked one existing fictional evidence item to two requirements, observed 2/2 in the display, then unlinked both; evidence item and legacy note remained, display reverted to 1/2 for that independent legacy note. Reloaded and confirmed both structured link checkboxes unchecked. Screenshot `/tmp/carvio-evidence-reuse-verified.jpg`. CV Lab integration shares the editor but its full navigation path has not been manually exercised in this pass. No account registration/email/cloud test performed.

### Contact-only follow-up repair — 2026-11-01

Manual local journey found that Plan follow-up rejected a draft opened from a contact without an application. Repaired explicit-ID routing: contact context takes precedence; application-only context remains supported; no company-name inference. Planning updates only next action/date, not last-contact, delivery or interview records. Existing actions require confirmation before replacement. Calendar date formatting now uses the local day rather than UTC slicing. Added three pure regression tests (42 total). Also retained the pending trust-card copy correction so empty fields are not described as used facts. No public deployment.

Final local verification: 42 tests, targeted ESLint and production build passed. Generated a fresh contact-only draft on the rebuilt app; Plan follow-up saved an action dated Nov 8, 2026 on the existing contact (one contact, no meeting). Overview still showed zero conversations and zero interviews, and the unrelated application action remained unchanged. Screenshot `/tmp/carvio-contact-follow-up-fixed.jpg`. Replacement confirmation is implemented but its accept/cancel paths have not yet been manually exercised.

Replacement confirmation follow-up: the native browser confirm blocked the automation before either branch could be verified. Replaced it with the existing accessible in-app Modal: current/proposed actions and dates, explicit Cancel/Replace, safe initial cancel focus, Escape cancellation, and a stale-record guard to avoid overwriting an action changed while confirmation is open. Browser verification of these branches is recorded below after completion.

Verified the new confirmation locally: saved a distinctive existing action, opened replacement, cancelled, reopened and confirmed the original action/date were intact; explicitly selected Replace reminder and verified the new action/date in Networking, with exactly one contact and no scheduled meeting. Screenshot `/tmp/carvio-safe-replacement-dialog.jpg`. 42 tests and production build passed; ESLint initially exhausted its default heap but passed separately with a 6144 MB heap. Escape and concurrent-record-change branches are implemented, not manually exercised in this pass. No public deployment.

### First-use follow-up — 2026-10-31

Tested a fresh isolated local origin on port 3027, not demo and not the personal workspace. Confirmed zero applications/contacts initially, selected active search, saved company/role plus an optional undated action, and completed the action. Considering remained unchanged and submitted/interview/conversation counts remained zero. Fixed the resulting planning explanation to describe an unsubmitted record as a saved opportunity, not an active application; both recommendation surfaces now use the same reason. Added bilingual regression coverage for the completed-action state. This does not verify email/account registration.

- Manual journeys are not a full automated E2E suite. All mobile, keyboard, dark-theme and accessibility permutations are not yet verified on the final build.
- Email delivery, registration and cloud restore are unverified. Optional backup collections and all unknown fields are not comprehensively schema-validated.
- No real seven-day observation or timed human usability study has occurred.
- New AI evidence can link to multiple requirements; a general existing-evidence relinking editor is not implemented. Draft context IDs are session context, not a durable saved-draft library.
- External search routes prepare queries; they do not verify vacancies or guarantee LinkedIn ranking/results.
