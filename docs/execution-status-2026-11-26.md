# CARVIO execution checkpoint — 2026-11-26

## Released baseline

Production: https://carvio-pi.vercel.app. Main baseline `d77a7126e627d3250913dec2f88c579b7e44ff73` (PR #120), following visual PR #118 and synchronization PR #119. Signed-in synchronization starts automatically without an activation checkbox; prior device flags cannot disable startup. Customer-specific confirmation remains pending.

## Isolated analytics candidate

Branch `fix/analytics-identity-release-20261126`. Reuses only the analytics modules from the unshipped PR #108/#114 work; does not merge their stacked integration histories or PR #112.

Confirmed defects on main: queued events acquire the user present at flush time, sessionStorage ID survives account changes, stale initial getSession results can race authentication changes, return-day state is global, repeated background heartbeats and idle focused time inflate telemetry. The existing account-session helper also revived an earlier account's session after redirect/reload; two new regressions failed before the fix and pass afterward.

Changes: immutable account ownership for queued rows; discard an outgoing account's unsent queue and guard late acknowledgements; owner-aware IDs across redirects/reloads; stable session-start/acquisition row IDs with INSERT ON CONFLICT DO NOTHING semantics; account-specific return-day state; safe storage/network failures; focused foreground active-time clock with a 60-second idle cutoff and only changed heartbeats. Repeated token callbacks do not start new sessions.

Verification: 180 local unit tests, TypeScript, targeted ESLint and optimized build passed. Browser acceptance additionally checks actual Supabase-client event requests against isolated Auth/PostgREST fixtures: authenticated owner must match every row, account session IDs must be distinct, retries use ignoreDuplicates, and session/acquisition IDs are stable. Ephemeral PostgreSQL checks event retry idempotency and ownership RLS alongside the existing workspace acceptance. Final CI checks the exact candidate and preserves automatic cloud-sync regression coverage.

No schema or historical-row changes; no customer account or production analytics data is mutated by development tests. Changes in event counts after rollout must not be presented as changes in real engagement without accounting for instrumentation changes.

## Remaining work

Anonymous collection/identity bridging, cross-tab shared-session coordination, inactivity-based session expiration, trusted internal/preview/test classification, a connected secure management dashboard, real hosted-account cross-device acceptance, and live relevance benchmarking remain pending. This is an account-isolation/active-time release, not a complete analytics single source of truth. Failed in-memory queues are not durable across full browser termination.

Original 18-section mission estimate remains 57% at this checkpoint. No new production approval is implied for this separate analytics package. Publish the candidate PR and exact checks, then obtain final release approval. Next executable task after this package: anonymous search funnel continuity, using the existing public-search work rather than rebuilding it.
