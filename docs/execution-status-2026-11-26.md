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

## Focused public-search handoff candidate (2026-11-26)

Branch: `fix/find-workspace-context-20261126`, based on released main `a64b6794e92e7efc3738e5dd2e284f1e8c6f2779` (PR #121). Extracts only public-search handoff intent from unmerged PR #117; does not merge its other changes.

The `/find` workspace link now carries submitted role, canonical country/city and language. Workspace hydration selects Search, initializes only those explicit criteria without stale advanced filters, and removes the consumed URL parameters. Other workspace records are unchanged. The first cloud restore preserves the incoming search/language, including edits made while it loads; subsequent cloud updates behave normally.

Local verification: 183 unit tests passed; TypeScript passed; ESLint has no errors (one pre-existing unused analytics constant warning); production build passed. Dedicated Playwright matrix checks Hebrew/English at 390px/1440px using isolated demo storage, exact input values, locale, clean URL and refresh persistence. CI includes this matrix alongside existing cloud/database regression suites. No real account, database or production data is modified. Authenticated handoff against the live backend remains unverified.

Overall mission completion remains 57%. This candidate is implemented, with release CI and preview pending. Production unchanged; no merge/deployment until the focused release is approved. Next executable task: finish candidate CI/preview and verify authenticated handoff in an isolated environment.
