# CARVIO Job Radar — controlled pilot / release decision

Reviewed 27 November 2026, Asia/Jerusalem. Development branch: `dev/job-radar`.

**GO for isolated dry-run; NO-GO for real sending.** This is a prepared development package, not an active pilot. No real email was sent and no production deployment or migration was performed.

## Scope and controls

Use exactly two unique verified accounts with current explicit `job-radar-v1` consent. Existing site registration does not constitute consent. Currently the isolated development backend has zero subscriptions and zero enrolled participants. Production has no Radar consent tables; do not copy existing user emails into a cohort.

Default schedule: Sunday/Tuesday/Thursday 09:00 Israel for three alerts weekly; Sunday/Thursday for two, per saved preference. Jobs are capped at five per message. Empty, stale, closed, unapproved-source, duplicate or unverifiable-history results fail closed. Only runtime OAuth verified as `carvio.team@gmail.com` can send. No tracking pixels; conversions are verified against account ownership and saved cloud evidence.

`job_radar_pilot_control` is server-only and starts OFF. Final live gate checks the cohort, verified account, current consent, preference version, reservations, sent history and daily limit (maximum two). Unknown provider results consume the limit and retain reservations, preventing blind retries. Cohort changes require the switch OFF; activation validates exactly two consented verified members. No real members have been enrolled.

Emergency stop, by a privileged operator on the intended backend:

```sql
update public.job_radar_pilot_control set enabled=false where singleton;
```

This serializes with the final send gate and cancels pending live claims/reservations immediately. Requests already authorized/in flight to Gmail cannot be recalled; reconcile them before resuming. Individual preference withdrawal remains synchronous and cancels that user's pending attempts. Keep CI live sending unavailable until a separate explicit approval and controlled activation implementation; current CLI is dry-run only.

## Daily report

Existing daily workflow is prepared for 10:00 Israel, disabled unless `CARVIO_RADAR_REPORTS_ENABLED=true`, and currently accepts the isolated development backend only. It persists aggregates and a GitHub summary, not an emailed report. It backfills eight completed Israel days for late conversions within seven elapsed days.

Includes accepted sends, failures, unknown outcomes, unique-per-digest clicks/returns/saves/user-marked applications, conversion rates, unique returning users, unique users stopping alerts on that day, and isolated dry-run counts. No identities, addresses, job IDs or attribution tokens are emitted in report output. Gmail acceptance is not inbox delivery; a user-marked application is not employer confirmation. Null rates mean no denominator.

Traffic is reported separately as sessions with a verified Radar click and **organic or unattributed** sessions, using existing `product_events` session IDs. Missing IDs, heartbeats and duplicate rows do not create sessions. Coarse verified-click session markers can be lost to blockers, network failure or session expiry and do not prove causality; server-verified per-job conversions remain the primary funnel. A missing product-events table is explicitly unavailable, never fabricated as zero. Session rows are browser telemetry, not an independent security boundary. Attribution starts only after this version is released; historical untagged visits cannot be retrospectively classified.

## Baseline and success criteria

Read-only reference for all CARVIO, completed Israel week 20–26 November 2026: 10 identified session users; 31 distinct `(user_id, sessionId)` sessions; three unique returning users; four `opportunity_saved` events; zero `marked_applied` events. These are site-wide telemetry counts, not the pilot cohort, unique jobs or proof of no external applications. No pilot uplift can be claimed yet.

Before activation freeze the actual consenting cohort and its preceding seven complete Israel days using the same session/event definitions, then compare equal seven-day windows for the same users. Keep the aggregate snapshot with cohort size, window boundaries, query/version and generated time; private cohort membership remains access-controlled. Baseline for the real cohort is **pending**, because no eligible real cohort exists. Wait seven days beyond the final sent cohort for mature conversion comparisons.

| Measure | First-week pilot target / action |
|---|---|
| Unconsented, wrong-sender, duplicate or invalid-job sends; privacy incidents | Zero; any occurrence stops pilot |
| Unknown provider outcomes | Stop and reconcile; never retry blindly |
| Gmail accepted / completed attempts | At least 95%; report denominator and unknowns |
| Unique participants clicking | At least 30%, rounded up |
| Unique participants returning | At least 20%, rounded up |
| Cloud saves | At least one genuine job save |
| Applications | Exploratory user-marked metric; no employer-confirmed claim |
| Unsubscribes | Review if at least 20% or two participants stop |

These are proposed pilot criteria, not measured achievements or statistically significant lift. Daily report rates are per digest; cohort-level targets require deduplicating the private participant set across the full pilot week, rather than summing daily user counts.

## Free infrastructure and remaining blockers

- Public GitHub standard runners are free under the documented current policy. Schedules are best effort, can be delayed and run from the default branch. The development workflows are not active schedules. A run outside the 09:00–09:14 send window is skipped rather than sent late.
- Consumer Gmail documents a 500/day sending ceiling with possible temporary blocking and lower practical limits for abuse/bounces. Two messages/day is a conservative local cap, not a delivery guarantee. OAuth consent/testing token expiry and quotas must be verified for the actual CARVIO Google project before activation.
- Isolated Supabase is on the existing free setup; account/project quotas and availability must be rechecked before real activation. No paid vendor or upgrade was configured.
- Source allowlist remains empty: approve lawful existing public ATS boards appropriate to the cohort before any real delivery. Search-result URLs are never jobs.
- Runtime Gmail OAuth, backend service credentials and secrets are absent here. Chat Gmail access is not runtime OAuth. Do not expose or transfer personal-account tokens.
- Routes, migrations, safe runtime activation path and report schedule are not released to production. No live CLI was added or enabled.
- Need two actual opt-ins, selected membership, actual cohort baseline, source checks against their preferences, authenticated final dry-run with the intended runtime credentials, followed by explicit sending approval. Consent and schedule checks alone are insufficient to approve sending.

References checked: [Gmail limits](https://support.google.com/mail/answer/22839?hl=en), [GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage), [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## Validation

292 automated tests pass; TypeScript check and production webpack build pass. Final fixture dispatch dry-run: eligible (five jobs), no new jobs, revoked, closed jobs, missing history; zero send calls. Report fixture is synthetic and labeled, never persisted as real sending.

Actual isolated SQL rollback tests cover protected dispatch history, final consent gate, revocation, unknown-send reservations, attribution ownership, replay deduplication, saved-cloud conversion evidence and global pending cancellation. Additional pilot test checks default OFF, membership exclusion, uncertainty consuming the daily cap, protected control access and stopping pending sends. No SQL fixture invokes Gmail. All fictional users/consents/messages are transaction-local and rolled back.

Security advisor retains one intentional warning on the existing owner-authenticated consent RPC (`save_job_radar_preferences` SECURITY DEFINER). The function uses `auth.uid()`, verified-account checks, a fixed empty search path and field validation; it is intentionally callable by an authenticated owner. No new public control access is granted. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
