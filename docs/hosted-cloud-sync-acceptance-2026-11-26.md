# Hosted cloud synchronization acceptance — 2026-11-26

Production code: `efd3313c69aa8eab7a67c3c83aa9aac59591ae76` (PR #122). User explicitly approved creating `carvio.team+qa-sync-20261126@gmail.com` and two fictional applications in the existing hosted project. Account creation, email confirmation through the CARVIO Gmail inbox and real Supabase authentication succeeded. No customer account was used.

## Observed results

Playwright operated independent 390×844 touch/mobile and 1440×1000 desktop browser contexts against the live production site. Auth and workspace API requests were real, with no fixtures or workspace request interception. Only test product analytics writes were suppressed.

- Anonymous REST reads exposed zero workspaces. Catalog inspection confirmed RLS is enabled, authenticated SELECT/INSERT/UPDATE grants exist, and ownership is checked in both USING and WITH CHECK.
- Two fictional applications added through the mobile UI reached Supabase in an observed 11.351 seconds after additions.
- A fresh desktop context received both automatically in 11.781 seconds after initialization; the first application was visible in its applications screen.
- Desktop changed the first application's status to Applied. Supabase reflected this in 3.940 seconds after selection.
- Bringing the mobile context to the foreground received that status automatically in 19.139 seconds, without reload or pressing any synchronization control. Both applications remained present.
- No uncaught browser errors occurred.

These timings are one observed run, include polling/network overhead, and are not performance guarantees. A mobile browser emulation is not a physical Android handset. This does not prove that the reporting user's original records were recovered, or complete real-account RLS isolation between two distinct users; prior isolated regressions remain separate evidence.

No product-code defect was reproduced, so no application code or deployment changed. The two fictional applications remain in the dedicated QA workspace for review. The QA account must be excluded from business registration/retention analysis; production-wide trusted test classification is still pending. Browser contexts were closed, the QA Auth session was signed out and its private temporary session file removed.

## Repeatability

`scripts/cloud-sync-hosted.mjs` requires explicit `CARVIO_QA_ALLOW_TEST_WRITES=yes`, a private real Auth session file and a public anon/publishable key. It checks the exact approved QA email and refuses any existing cloud workspace. This is deliberately a first-run acceptance harness; it must not be pointed at customer accounts or reset existing data for a rerun. Sessions, passwords, tokens and keys are never committed. Screenshots are local QA artifacts; the committed JSON report is sanitized.

Validation: live hosted browser run passed; script syntax and targeted ESLint passed. No product code, dependency, schema or build behavior changed, so the full application build and prior 183 tests were not repeated for this QA-only package.

Overall original mission: **58%**, increased from 57% for newly verified real hosted two-context persistence and status propagation. This specific acceptance scenario passed. Broader production readiness remains incomplete. Next priority: establish reliable test/internal analytics exclusion and reproduce any remaining customer-specific synchronization failure without touching customer data.
