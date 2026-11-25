# Visual consistency release — 2026-11-25

Scope: visual fixes only, based on main/PR #116 at `bf37639e0722440b92133932048bdadf4121b490`. Branch: `fix/visual-consistency-20261125`. No integration-branch analytics, persistence, search-adapter or database changes are included.

## Changes

- Replace remaining purple/violet/fuchsia utility and literal colors with slate, teal and mint throughout workspace, dialogs, public search and legacy palette definitions.
- Repair light-theme text/button pairs, mobile navigation, saved-job evidence, helper text, CV review surfaces and recommendation explanations.
- Default to light before hydration regardless of OS preference; ignore legacy local/cloud theme preferences without changing workspace records.
- Respect reduced-motion preferences for CSS transitions and programmatic scrolling.
- Reuse bilingual public-search labels/direction and retain the selected interface language in links. Job-source adapters remain unchanged.
- Add candidate-build Playwright visual coverage and an Actions workflow with screenshots and machine-readable findings.

## Verification

Local: ESLint has zero errors (one pre-existing unused analytics constant warning); TypeScript passes; all 136 tests on main pass; optimized production build passes. Visual tests cover English/Hebrew at 1440×1000 and 390×844 with dark OS preference and seeded legacy theme preferences. They visit landing, six main views, five career tools, application/contact dialogs, saved-job evidence, settings/privacy/feedback, appearance, mobile menus and public search. The test asserts no horizontal document overflow, purple colors, reported solid-background text contrast failures or browser exceptions, and unchanged demo applications/contacts/CVs after navigation and reload.

Solid-background contrast scanning is a regression check, not a complete WCAG certification: gradients, images, focus order and assistive technologies require human review. Screenshots use explicitly labeled fictional demo data. No real user workspace is modified. Authenticated cross-device/RLS acceptance belongs to the separate integration mission and is not claimed by this visual release.

## Release gate / rollback

Merge only this isolated branch once candidate checks are green. Production deployment is authorized by the user for verified styling fixes. Confirm Vercel deploys the resulting main commit, then inspect the public production routes and take release screenshots. Previous main SHA above is the rollback reference; revert the isolated visual commit or restore its previous deployment if a visual regression occurs.

Original full-mission completion remains 55% until release verification. This task does not establish completion of the remaining analytics/cloud/search acceptance criteria.

## Verified candidate checkpoint

- PR #118 candidate `4cea6e82f02ba404a80ba6ae9307342fe0b1a0af` has the same tree as local `79800ba` (`16db04973c729b1f1dcb8d15d9aeac34ab503ff4`).
- Broad local visual pass: 85 states, zero reported contrast/purple/overflow findings; focused expanded-dialog pass: 22 states, zero findings.
- Vercel Preview for that candidate: 14 additional remote browser states passed (Hebrew mobile/English desktop, email sign-in form without submission, cloud access panel, public search, light-theme defaults and fictional evidence/gap cards).
- Final review also corrected placeholder contrast in public/account forms. Overall full-mission development estimate: 56%; production status remains pending until deployment confirmation. This does not raise the implementation or verification estimates for unrelated workstreams.
