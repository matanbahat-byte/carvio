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

### Remaining verification / limitations

- Manual journeys are not a full automated E2E suite. All mobile, keyboard, dark-theme and accessibility permutations are not yet verified on the final build.
- Email delivery, registration and cloud restore are unverified. Optional backup collections and all unknown fields are not comprehensively schema-validated.
- No real seven-day observation or timed human usability study has occurred.
- New AI evidence can link to multiple requirements; a general existing-evidence relinking editor is not implemented. Draft context IDs are session context, not a durable saved-draft library.
- External search routes prepare queries; they do not verify vacancies or guarantee LinkedIn ranking/results.
