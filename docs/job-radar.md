# Job Radar development status — 2026-11-27

## Isolated environment

Supabase project `carvio-dev` (`pzykndfxenwqnpvrbkby`, Frankfurt) was created in the existing organization after authorization. The quoted cost was $0/month. Production `JobFlow` (`uvaurzhmziscgfqbgopt`) was not modified. This is a separate project, not a paid preview branch. No production users or data were copied.

Only the Job Radar schema is installed here; other CARVIO features may require their own development schema. The existing foundation migration and new delivery-history migration have been applied. Local ignored `.env.local` points at `https://pzykndfxenwqnpvrbkby.supabase.co` and uses its publishable key in the existing `NEXT_PUBLIC_SUPABASE_ANON_KEY` variable. Retrieve a current publishable key from this project's dashboard when rebuilding a workspace. Never substitute a service-role key or change production Vercel variables. No email provider, scheduler, sender or production deployment is enabled.

## Consent and settings

The existing invitation appears once per browser after explicit search links are prepared, not proof that matching job listings exist. Existing saved preference records suppress it across signed-in devices. “Maybe later” suppresses repeated invitations in browser storage; the management control stays available. Clearing guest browser storage can allow a later invitation. Guests are asked to sign in and choose consent again; no consent transfers automatically.

Saving requires the explicit Enable and save action and consent statement. `job-radar-v1` identifies the statement in `components/job-radar.tsx`; change the version and validation if the scope changes. The RPC verifies the account and authenticated owner, validates fields and records timestamp, preferences, language, frequency and immutable consent events atomically. Only owning users can read these rows. Revocation retains the persisted preferences/frequency. Client writes directly to preference and audit tables are denied.

The security advisor reports one intentional warning: the authenticated consent RPC is SECURITY DEFINER. It needs privileged access to verify `auth.users` and atomically write tables denied to clients. It uses `auth.uid()`, an empty search path, field validation and explicit grants; anonymous execution and direct client writes are denied. Owner isolation and unverified account rejection were tested on the real dev database. See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable. No performance advisories were returned.

## Preparation from saved preferences

`prepareRadarJobs` accepts a request-scoped authenticated Supabase client. It derives the user from `auth.getUser()` rather than accepting a browser-supplied user ID. It loads that owner's preferences and confirmed delivery history, then invokes the source collector and selection. Failed, malformed or truncated history blocks preparation instead of treating history as empty. History currently reads up to 1,000 rows with an exact count; larger histories are blocked until paging is added. Changes or revocation while collecting sources invalidate the prepared results. There is no HTTP endpoint, cron or batch runner enabled.

`job_radar_deliveries` stores actual successful deliveries only. Users can read their own records; only the service role can insert. Clients cannot fabricate, edit or erase history. This implementation never inserts a delivery, because nothing is sent. A future sender needs idempotency/reservation and a final consent check; preparing a digest is not delivery.

## Source collection and selection

`createRadarSourceCollector` accepts trusted server-side approved boards only. It uses the existing Greenhouse/Lever endpoints and normalizers, with a five-board per-run budget, five-second request/body timeout, two-megabyte streaming cap, redirect rejection, JSON validation and five-minute process-local cache/backoff. Concurrent calls share in-flight requests. Reuse one instance per worker; multi-instance activation also needs a shared request budget.

`selectRadarJobs` returns at most five distinct direct postings, newest first. It reuses the bilingual role/country helpers and requires explicit country/city evidence, matching seniority, a fresh current board snapshot (15 minutes), and an original publication date within 14 days. Unknown dates, ambiguous locations/levels, search links, previously delivered IDs/URLs and duplicate postings are excluded. No result is invented. Conservative matching reduces coverage. City aliases cover Tel Aviv, Jerusalem, Haifa, Berlin and Amsterdam; other cities match literally. Equivalent roles are limited to existing search dictionaries. A fresh board snapshot is an activity signal, not a guarantee a role remains open later.

**Live source blocker:** the repository's candidate board list is not an approved allowlist. https://github.com/lever/postings-api documents public postings and job-site use; https://docs.greenhouse.io/job-board documents public GET access and company career sites. Third-party alert redistribution permission was not established in this review, so `APPROVED_RADAR_BOARDS` stays empty. No real employer-board requests were made. An employer/provider approval reference and coverage review are needed before activation. Tests inject fixture-only board approvals and fictional payloads. No paid vendor or scraper was introduced.

## Validation completed

- `npm test`: 261 passed, zero failed, after installing the repository's existing dependencies.
- `npx tsc --noEmit`: passed.
- `npm run build -- --webpack`: passed, with local dev Supabase configuration only.
- `tests/sql/job-radar-dev.sql` on actual carvio-dev: save, edit, revoke, verified-account enforcement, immutable audit, service-only delivery writes and cross-user RLS isolation passed. Transaction rolled back all fixtures.
- `tests/job-radar-dev-integration.mjs` using Supabase JS and real dev Auth/REST: confirmed fixture login, consent save, saved preferences/history preparation with fictional job data, denied client delivery write and revocation passed. It guards the exact dev URL. It requires an externally provisioned confirmed fixture account and never signs up or sends mail. The temporary account and its records were deleted after testing; all three Radar tables and auth.users were verified empty.
- `tests/job-radar-browser.mjs`: Hebrew and English, desktop 1280px and mobile 390px passed. Checks initial invitation suppression, invitation after search submission, editor/frequency, verified-login requirement for guest save, suppression after reload and section width. Uses an optional local test server (`CARVIO_START_LOCAL_SERVER=1`) and configurable Playwright/Chromium paths. Standard Chromium download was unavailable, so the test used an independently installed temporary Chromium package. Authenticated saves were tested through real REST, not through browser UI.
- `git diff --check`: passed.

Full authenticated browser save/reload/edit/revoke checks, source permission and live coverage checks, shared source budgeting and sender design remain before release. No production changes and no emails were sent.

## Step 3: personal email template and internal links

`lib/job-radar-email.ts` renders an optional personal greeting, localized subject, responsive HTML and plain text in Hebrew/RTL or English/LTR. It uses inline table layouts, turquoise/mint colors, up to five distinct validated postings, direct role/company/location details and CARVIO buttons. Text is HTML-escaped; no pixels, external assets, recipient identifiers or search preferences are placed in links. Invalid/search links are rejected and an empty selection produces no message.

There was no existing public per-job route, so this step adds `/radar/jobs/[id]?lang=he|en` and `/radar/preferences?lang=he|en[&action=stop]`. The job ID is a deterministic SHA-256 of the public source posting ID, shared between users; it contains no recipient data and grants no access to private user data. Each page shows the matching catalog entry and the existing source posting URL. Missing, inactive, expired or invalid entries show an unavailable state rather than invented data. The public page does not claim live source revalidation. Catalog entries expire after seven days unless a trusted worker refreshes them; availability is checked on the source site by the applicant.

The new `job_radar_listings` table is installed only in carvio-dev. It contains public job snapshots only, with RLS allowing anonymous/authenticated read of active/unexpired entries. Only the service role may insert/update. `prepareRadarEmail` requires a trusted worker client, persists all selected listings before returning the rendered message, and throws on a failed write. Future orchestration must first call the existing consent-aware `prepareRadarJobs`; no sender, scheduler or browser catalog-write endpoint was added. No service-role key was created, stored or exposed by this step.

Preferences reuse `JobRadar` with a small optional `openSettings` flag, leaving existing invitation behavior unchanged. Settings require authenticated ownership through the existing consent RPC. Opening either footer link, including `action=stop`, performs no mutation: stopping requires the existing explicit button. A guest is directed to workspace sign-in. No unsubscribe token or personal identifier appears in the URL. The stop route is an authenticated settings flow, not an RFC 8058 one-click email-header unsubscribe endpoint.

Validation for this step:
- `npm test`: 266 passed; `npx tsc --noEmit`, webpack build and `git diff --check` passed.
- Five new unit scenarios cover bilingual output, five-card cap, deduplication, internal-only links, no PII in links, escaping, malicious/search URL rejection, empty email suppression, stable IDs and persistence failure.
- `tests/job-radar-email-browser.mjs`: HTML rendered and visually inspected at 1280px/390px in both languages. All five unique job links opened the corresponding seeded job pages in local CARVIO against the real dev database. Both footer routes loaded and prompted guest sign-in; opening them did not call a consent mutation. Missing-job state and no horizontal overflow passed. No source-site application links were followed.
- `tests/sql/job-radar-email-dev.sql`: actual development database verified active/unexpired-only reads and denied anonymous/authenticated writes; fixtures rolled back.
- Five fictional catalog rows were temporarily seeded for browser QA and deleted afterward; cleanup confirmed zero fixture rows. No real users or job boards were contacted.
- The security advisor returned only the previously documented consent-RPC warning, with no new findings.

Browser previews are not a Gmail/Outlook rendering certification. Before sending, deploy the internal routes through a separately authorized release, test actual email clients and confirm live source permissions. The default template links target the existing CARVIO production origin; local QA explicitly overrides this with loopback. Nothing was emailed or deployed by this step. The source approval blocker remains unchanged.

## Step 4: scheduled worker (development, disabled)

See [job-radar-dispatch.md](job-radar-dispatch.md) for the new persistent queue, Gmail-only transport, Israel-time schedule, dry-run evidence and explicit activation blockers. This supersedes earlier foundation statements about absent worker code; no live sender, cron activation or production deployment has been enabled.
