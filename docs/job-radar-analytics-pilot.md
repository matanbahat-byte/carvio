# Job Radar steps 5–6: analytics and pilot readiness

Development integration only; no email was sent, no schedule was enabled, and production was not changed. The two commits from `dev/job-radar-analytics` are integrated with stages 1–4 in `dev/job-radar`, preserving the original branch history.

## Daily reporting

`radarDailyReport` now aggregates confirmed sends, failures, uncertain outcomes, authenticated clicks, workspace returns, cloud-backed saves and applications marked in CARVIO. It deduplicates at digest level and calculates click/return/save/apply rates against confirmed sends. Zero-denominator rates are null, not invented zero-percent conversion. The report does not claim an employer has received an application or that Gmail acceptance proves inbox delivery.

Cohorts use Israel calendar days, including 23/25-hour DST days. Attribution can occur for seven elapsed days after a send; late conversions are retained instead of being cut off at UTC midnight. Reports include an as-of timestamp and a maturity flag. The daily runner backfills the last eight completed Israel days, updating older cohorts while their windows mature. Dry-run outcomes are diagnostic only and never enter real send/conversion denominators.

`generateRadarReports` reads persisted dispatch and action events through a backend client, fails closed on unavailable/truncated/capacity-exceeded reads, and optionally upserts aggregate JSON by day. `radarReportMarkdown` formats a readable Hebrew report without email addresses, names, user IDs, digest IDs or tokens. A GitHub job summary can display the latest completed day. There is no publicly accessible report endpoint.

`.github/workflows/job-radar-report.yml` targets 10:00 daily in `Asia/Jerusalem`. It requires an explicit opt-in variable and separate development backend secrets. It is not activated from this branch. The CLI refuses production URLs. These workflows remain best-effort GitHub schedules, not an exact-time SLA.

## Attribution and privacy

Each prepared live dispatch receives a random per-listing UUID after its public job snapshot has persisted. Links contain the public listing hash, language and opaque `r` token; never a recipient address, user ID or search preferences. The token is pseudonymous and must not be logged or shared as an identity. Its protected server mapping binds it to the recipient, digest and listing for at most seven days. Forwarded links cannot attribute another account's actions.

The browser removes `r` from the visible URL and retains up to ten temporary contexts in session storage. There are no tracking pixels or email-open estimates. An authenticated, verified recipient must own the token; the message must have a confirmed send state and current consent. GET/HEAD alone never writes events, and anonymous scanners cannot record an authenticated click. Withdrawal stops further event recording. Click statistics are authenticated landings, not every anonymous link open.

`/api/radar-events` performs same-origin validation and server-side account validation before calling the owner-checked database function. It accepts browser Fetch Metadata or a same-origin Referer only when Origin is absent, never against an explicit foreign/null Origin. The job page uses same-origin referrer policy, while outbound source links retain `noreferrer`. No token/recipient data is sent to an external source site by this code.

Workspace returns are recorded when an attributed account opens the workspace. This contextual client metric can undercount returns after tab/session context loss. Save/application conversions are stronger: a private trigger also evaluates the authenticated owner's persisted cloud workspace, matching the exact job source and post-send action evidence. This supports later/cloud-synced actions even on another device after the verified click. Existing records and merely opening an application link are not silently classified as new saves or submitted applications. Guest/offline-only actions are not counted until verified ownership and cloud evidence are available. Analytics cannot make a normal cloud save fail.

Raw links and action events are backend-only with RLS/grants; public/authenticated clients cannot list mappings or the analytics tables. Client replay and duplicate notifications are idempotent by digest/listing/event. Report output is aggregate only. The existing consent and sender checks remain unchanged.

## Pilot preparation and boundaries

`radarPilotReadiness` validates a target of 5–10 unique accounts, explicit current consent and verified email, and returns aggregate readiness/blockers without identities. Five fictional consenting accounts completed the existing dispatch dry-run, with zero Gmail calls and no fabricated real delivery counts. Actual participants have not been selected or enrolled: the isolated development database is not the production subscriber list.

A real pilot is blocked until an authorized job source, backend Gmail OAuth credentials, released internal routes, runtime backend configuration and at least five real explicit consents are available. Existing platform registrations are not treated as Job Radar consent. Sending and production release still require separate authorization. No new paid service or billing change was introduced.

## Validation evidence

- Unit suite: 289 passed; report cohort boundaries, delayed attribution, dry-run exclusion, missing-data failure, source-link tokens, privacy output, pilot eligibility and same-origin validation are covered.
- TypeScript and webpack production build passed against development configuration.
- `tests/sql/job-radar-attribution-dev.sql` passed against actual carvio-dev and rolled back all fixtures: sent-only attribution, owner/forwarded/scanner isolation, duplicate protection, automatic cloud evidence, withdrawal and protected tables.
- Existing dispatch/consent dry-run tests remain in the suite; Gmail transport tests use fake request functions only.
- Browser/API integration status is recorded below after the final run. The test uses a local HTTP bridge for the managed Chromium proxy while forwarding to the actual Next/Supabase APIs. It does not stub response payloads or bypass database ownership, consent or provenance checks. Temporary fixture identities/dispatches use fictional example.test accounts and simulated provider acknowledgment; no Gmail endpoint is involved.
- Security advisors retain only the previously reviewed public consent-RPC warning. Missing listing-FK index was fixed; unused-index information is expected on an empty development dataset.

Final browser/API result: PASSED: actual authenticated Next/Supabase API flow, guest denial, URL cleanup, workspace return, cloud save and application-mark evidence; database replay/isolation checks passed. Managed-browser network forwarding preserved the actual API response payloads..
Fixture cleanup: COMPLETED: fixture account, workspace, dispatch, action events and token mappings removed; counts verified zero. Eight empty aggregate reports were then generated in dev only, accurately reflecting no real sends. See job-radar-daily-report-preview.md..
