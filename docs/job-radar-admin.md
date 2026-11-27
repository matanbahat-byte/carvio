# Job Radar internal administration

Development branch only. No production deployment/migration, real sends, paid service or administrator grants were performed. Sending remains OFF.

## Access and operation

Route: `/admin/job-radar?lang=he` (or `en`). Server page and API independently verify the signed-in, verified, non-anonymous account against `radar_private.admin_members`. The database RPC checks the same authoritative membership again. No user metadata, email-domain heuristic or client role flag grants access. The default administrator list is empty; a trusted database operator must provision an existing verified account before the page can be used. Ordinary users cannot read or alter that list, classify accounts, access raw admin tables, or promote themselves. Removal/active=false revokes the next request.

The admin tables are private, RLS-enabled and intentionally have no client policies or grants. Public RPC entry points are invokers; private, fixed-search-path definer implementations validate administrators. Only aggregate counters and mechanism state leave the reporting RPC. API responses are private/no-store and vary by Cookie. No recipients, addresses, tokens, source URLs, personal IDs or Gmail credentials appear in the dashboard.

GET is read-only. POST can only stop, never enable sending; it requires same-origin validation and authenticated DB authorization. A confirmed stop updates the existing global pilot switch, cancels pending sends via the existing cancellation trigger and writes a private audit record with actor/time. In-flight Gmail requests cannot be recalled. An ambiguous timeout is displayed as unconfirmed, never as successful; refresh/reconcile and retry. No real administrator was enrolled as part of this change.

## Metrics and comparisons

Reuse the existing preferences, consent events, dispatches, reservations and server-verified action-event infrastructure. No duplicate browser tracking, mailing worker or reporting scheduler was added. Select a single Israel calendar day or seven calendar days ending on the selected date. Compare with the immediately preceding equal calendar period. Boundaries use Asia/Jerusalem, including DST changes.

The dashboard shows users who enabled in the selected period; currently enabled users separately; matching jobs selected; Gmail-accepted messages; failures; uncertain outcomes; digests clicked; distinct returning users; digests with saved jobs; digests with user-marked applications; distinct users stopping alerts. Dry-run-ready messages are diagnostic and excluded from all live metrics. Click/save/application rates use sent digests as denominator; no denominator yields unavailable.

Conversions follow the existing reporting model: accepted live messages sent during the period and actions within seven elapsed days after send, capped at current time; replay/listing duplicates count once per digest/stage. Recent cohorts are provisional and become comparable only after equal maturation. Returns count distinct users, not events/digests. Gmail acceptance does not prove inbox delivery; a marked application does not prove employer receipt. Enabled-now is a present snapshot, not a historical comparison.

The previous worker did not persist a historical count of selected jobs after cancellations deleted reservations. New `selected_job_count` captures the existing selector's reserved matching-job count when an attempt becomes prepared, retaining it after stop/cancellation. Existing retained reservations backfill known counts. Unknown historical prepared/sent/uncertain counts are shown as unavailable rather than zero. This is per-digest selected jobs, not all raw jobs discovered at sources; claiming raw source totals would be misleading.

## Cohort separation

Privileged, explicit classification only:

1. `account_labels.kind='test'` overrides any pilot membership.
2. Otherwise any recorded pilot membership is `pilot`, including inactive membership so past messages remain in that cohort.
3. Explicit `kind='real'` outside pilot is `real`.
4. Anything else is `unclassified`, never assumed real from an email or signup.

No combined option silently mixes tests with real/pilot results. Labels are current classifications, not an immutable historical cohort snapshot: changing labels can change historical comparisons. Keep labels stable during a pilot and freeze comparison snapshots when interpreting results. No real users or fictional test users remain classified by this implementation's rollback tests.

## Verification

296 automated tests, TypeScript check and production webpack build pass. Real isolated Supabase transaction tests verify administrator access, regular/anonymous/revoked denial, self-promotion denial, four separate cohorts, day/week comparisons, conversion/opt-out deduplication, missing historical counts, selected-count persistence, stop cancellation and audit. The original dispatch/consent/dedup SQL test also passes with the new count trigger. All fictional identities and records roll back; production is untouched.

Browser/API QA uses a local fictional backend only, separately from the real database authorization tests: guest/regular denial, Hebrew/English at 390 and 1280px without horizontal overflow, period/cohort filters, foreign-origin rejection, GET cannot stop, authorized POST stop and confirmation. No Gmail transport is instantiated.

Security advisor: three informational no-policy notices on the private admin tables are intentional deny-all RLS, not public exposure ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). The existing owner-only consent definer warning remains unchanged ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). No new exposed admin definer warning was reported.

Remaining operational prerequisites: provision administrator(s) and explicitly classify intended accounts through the trusted database operator; release only with separate authorization. Existing pilot blockers (actual consents, sources, runtime OAuth and baseline) remain; this screen does not activate the pilot.
