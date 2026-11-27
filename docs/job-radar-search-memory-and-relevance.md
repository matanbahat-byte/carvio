# Saved search and executive HR relevance — development review

27 November 2026. Continuation of PR 151. No sending, cohort enrollment or
production migration/release is authorized or performed by this change.

## Behavior

The first opt-in starts from the user's submitted search. For an already enabled
subscription, a newer submitted search updates the same six saved criteria:
role, country, city, seniority, workplace model and employment type. Frequency,
language and existing consent timestamps remain unchanged. Searches never
create consent, enroll pilot users, resume a paused subscription or enable the
runtime. The email includes a safely escaped summary of the saved criteria.

An owner-only RPC validates a confirmed non-anonymous account, locks its current
row, checks the expected preference version and submitted-search timestamp, and
updates criteria atomically. Stale tabs, old page refreshes and late updates after
revocation fail closed. Manual alert changes newer than the search win. The
existing version-change trigger cancels pending dispatches, and the worker's
final gate still checks the saved version before sending. Search updates do not
append fabricated explicit-consent records. Client success is shown only after
the server confirms persistence; failures retain previous saved criteria.

## VP HR correction

`vphr`, `VP HR`, common Vice President of Human Resources spellings and the Hebrew
equivalents resolve to VP HR intent. Provider links use quoted complete executive
HR titles rather than a compressed or detached VP keyword. Other role families
retain their existing quote behavior. Equivalent VP People titles are included;
HR Director, HRBP, recruitment manager, VP Sales and VP Product are not silently
added. Job Radar matches department and rank in the job title, not the employer's
name. LinkedIn may independently display promoted or expanded suggestions; these
cannot be removed through CARVIO's source-link generator. No LinkedIn scraping,
session manipulation or unsupported URL switches were added.

The current normalized public-source record does not carry verified workplace
model or employment type evidence. Selected values are preserved, displayed and
block sending with `saved_filters_require_source_evidence`; the worker must not
silently ignore these constraints. Source adapters and approved boards still
need review against actual cohort preferences before any pilot.

## Pilot preparation

Read-only checks confirmed the dedicated CARVIO sender connection, scope metadata,
pilot OFF, zero enrolled development participants and zero dispatch/delivery rows.
Both intended production accounts exist and have verified emails; private
addresses and search details are excluded from this repository. The owner has
now explicitly stated consent for both accounts in chat. That consent is distinct
from authenticated per-account subscription rows, which remain absent in the
isolated development backend. No production auth records were copied into dev.

Observed OAuth expiry is 4 December 2026 at 21:33 Israel. The readiness checker
now rejects a requested pilot horizon at or after the reported expiry or with
unknown expiry metadata. Testing-mode seven-day expiry is consistent with Google's
documentation, but the actual Cloud Console publishing state was not independently
verified here. Shared publishing/sign-in configuration was not changed.

## Validation and remaining work

- Unit tests cover saved-search capture, pause/guest/no-consent and stale-search
  exclusions, manual-edit precedence, safe bilingual email summaries, executive
  HR source queries/rank filtering and OAuth pilot horizon checks.
- Isolated SQL rollback checks cover owner-only updates, preserved frequency and
  consent, no fabricated consent audit entries, stale-tab refusal, account
  isolation and paused subscriptions remaining paused. No fixture data is retained.
- Security advisor has no additional warning; the existing consent RPC warning
  and intentional deny-all RLS notices remain as documented in the OAuth review.
- 328 automated tests and the webpack production build pass. Browser checks with
  fictional authenticated accounts pass in Hebrew/English at 390/1280px: search
  auto-update, frequency/consent preservation, canonical VP HR outbound links,
  refresh persistence and paused alerts remaining paused. No real Gmail endpoint
  or user mutation is involved. The public search page now passes its validated
  submission timestamp to Radar; without it, new searches could not be detected.
- Preserve branch-specific backend settings and review the production consent-UI
  release separately. Neither a completed search nor chat approval alone populates
  a development auth account or subscription. Targeted ESLint on the inherited
  component still reports its pre-existing ref-render/state-in-effect issues;
  the new standalone search/intent modules pass their checks.
- Search-only source-query correction is isolated in PR 152 from current main,
  allowing independent review/release without deploying Radar infrastructure.
- A separately reviewed controlled-send runner, exact approved test content and
  recipient list, approved source evidence, final dry run and pilot activation
  remain operational gates. No actual job payload or recipients were approved
  implicitly by these code changes.

References: [Google token expiry](https://developers.google.com/identity/protocols/oauth2/),
[deny-all RLS explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
