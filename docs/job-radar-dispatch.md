# Job Radar step 4 — scheduled delivery development

Implemented on `dev/job-radar`, tested with fixtures and isolated carvio-dev only. Nothing is deployed or enabled for sending. The Gmail connector named Carvio was read-only verified as `carvio.team@gmail.com`; no Gmail draft or send tool was called.

## Components and schedule

- `createRadarWorker` composes the existing ATS collector, bilingual selection, listing persistence and email template with the new persistent dispatch store and optional Gmail API transport.
- `radarScheduleSlot` uses `Asia/Jerusalem`, including DST. Three/week: Sunday, Tuesday, Thursday at 09:00. The existing two/week preference uses Sunday and Thursday at 09:00. There is no new custom-day/time UI. A cron delay up to 14 minutes is tolerated; later starts skip rather than sending a late catch-up batch.
- `.github/workflows/job-radar-dry-run.yml` specifies `cron: '0 9 * * 0,2,4'` and `timezone: Asia/Jerusalem`. The repository is public and uses the standard Linux runner; no paid vendor was added. It is guarded by an unset `CARVIO_RADAR_DRY_RUN_ENABLED` variable and is not active from the development branch. Scheduled workflows use the default branch and are best-effort, so 09:00 is a target, not a guaranteed delivery SLA.
- The CLI only accepts `--dry-run [--fixtures]`. It has no live entry point and never instantiates a Gmail transport. Development execution requires the exact carvio-dev URL and its backend service-role key. It refuses production URLs. The workflow has no Gmail secrets and cannot send even if its dry-run switch is enabled.

## Consent, activity and duplicate controls

A backend worker reads explicit enabled/current-version consent and verified, non-anonymous accounts. No consent or unavailable/truncated history fails closed. Fresh API-only ATS snapshots are filtered by the existing relevance rules. Up to five original selections must still appear as relevant in a fresh snapshot. The worker reuses snapshots for at most 30 seconds, caps source API requests at 20 per batch, and rejects snapshots older than 60 seconds at the final boundary. It never invokes the existing HTML fallback/scraper.

Persistent claims are unique by user, Israel local scheduled date and mode. Reservations are unique by user, source job ID and mode, with a second uniqueness constraint on canonical posting URLs. This protects even concurrent workers with stale reads. Real deliveries and pending/uncertain reservations are excluded before selection. Empty or closed/no-longer-relevant selections produce no message.

Preference updates/revocation synchronously cancel claimed/prepared attempts through a private trigger and release reservations known not to have been sent. The final gate locks and rechecks consent/version and confirmed delivery history immediately before a provider request; verified account email is also re-read. The Gmail identity check occurs before this gate, so OAuth refresh never creates an extra delay after it.

**Unavoidable boundary:** a revoke arriving after a Gmail HTTP request has already started cannot recall that request or an accepted email. Such in-flight consent changes are logged for reconciliation. The implementation does not promise recall of already accepted mail. This remains a release limitation to communicate honestly.

The Gmail send POST is issued at most once per dispatch. Timeouts, non-success or malformed responses become `unknown`; these reservations are never automatically retried. A stable Message-ID helps reconciliation but is not treated as Gmail idempotency. Provider acceptance and delivery-history writes are recorded atomically. If provider acceptance is followed by a database failure, the existing claim/reservations prevent resend and require reconciliation. A crashed claim is not automatically reclaimed.

## Data and analytics

`20261127090001_job_radar_dispatch_queue.sql` is installed only on carvio-dev. It adds `job_radar_dispatches`, `job_radar_reservations` and append-only `job_radar_dispatch_events`, service-role-only RPCs and a private revoke trigger. RLS and grants deny anonymous/authenticated reads and worker execution. The migration was generated with the CLI and moved after the existing future-dated foundation migration so a fresh replay creates the preference table before its revoke trigger.

Each attempted scheduled dispatch stores mode, state, scheduled local date, preference version, created/start/finish/sent timestamps, sanitized reason codes and a provider ID when available. No recipient email, subject or body is stored in these analytic tables or CI logs. User IDs remain protected backend references. Successful delivery history is updated only for confirmed provider acceptance; unknown outcomes retain reservations. Dry-run logs are explicitly labeled `dry_run_ready`, never `sent`, have no `sent_at`, and do not modify public listing snapshots or real delivery history. Dry-run reservations cannot interfere with future live mode.

## Gmail integration and remaining setup

`createRadarGmailTransport` uses a backend OAuth refresh token, verifies the actual Google account via the userinfo endpoint, and requires verified email exactly `carvio.team@gmail.com`. From is fixed to this address; there is no fallback sender or account alias. It sends RFC-style multipart/alternative UTF-8 content through the Gmail API, with folded subject headers, fixed Message-ID, input/header validation and no BCC/CC fan-out. No SMTP password or Gmail credentials were requested through chat.

The connector's tokens are not exported to GitHub/code. For a future separately authorized live release, a backend Google OAuth client/refresh token with `openid email` and `https://www.googleapis.com/auth/gmail.send` is still required. Supply credentials server-side to `createRadarWorker`, together with a trusted Supabase backend client. `liveEnabled` defaults false and must only change after a separately reviewed release. Do not put secrets in source, `NEXT_PUBLIC_` variables, command output or browser code.

Other blockers remain: the approved employer-board list is empty; the internal job/preference routes are not deployed to production; runtime backend credentials are not configured; the scheduler is intentionally disabled. The current CLI enumerates at most 200 enabled subscribers per run and reports capacity reached; more users require continued paging before activation. Per-user history reads over 1,000 entries fail closed. Shared rate budgets across separate workers and provider quota handling require review before scaling. No cost-bearing services or billing changes were made.

## Verification

- `node scripts/job-radar-worker.mjs --dry-run --fixtures`: eligible, empty, revoked, closed and unavailable-history cases passed with zero actual send calls.
- Development CLI without runtime backend secrets exits safely with `isolated_dev_database_credentials_required`; it does not contact Gmail.
- Eleven new focused unit scenarios cover Israel winter/summer/transition scheduling, frequency, dry-run isolation, simultaneous workers, activity/relevance/history, revoke/account/version gates, sender mismatch, disabled live mode, failure/uncertain outcomes, MIME headers and mocked Gmail acknowledgment. All provider API requests in tests are local fake functions, never network sends.
- `npm test`: 277 passed. TypeScript, webpack build and whitespace checks passed.
- `tests/sql/job-radar-dispatch-dev.sql` ran against the actual isolated dev database and rolled back: slot/job dedup, mode separation, final authorization, immediate pending cancellation, uncertain reservations, simulated acceptance/history/timestamps, protected analytic records and denied public execution passed. No emails were involved in its simulated acceptance.
- After rollback, dispatch, reservation, event, delivery and auth fixture counts were all zero.
- Security/performance advisors returned no new findings; the existing intentional consent-RPC warning remains documented in `job-radar.md`.

References: https://developers.google.com/workspace/gmail/api/guides/sending ; https://developers.google.com/identity/openid-connect/openid-connect ; https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
