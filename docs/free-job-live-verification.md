# First live public ATS verification — 2026-11-20

## Verified response (read-only)
- Provider: Greenhouse Job Board API
- Employer/token: Greenhouse / `greenhouse`
- Exact endpoint: https://boards-api.greenhouse.io/v1/boards/greenhouse/jobs
- Verification: HTTP-accessible JSON body with `jobs` array and `meta.total: 28` at the time of inspection.
- Sample: job ID `8279752`, Enterprise Account Executive, London, United Kingdom, first published 2026-10-14, application link https://job-boards.greenhouse.io/greenhouse/jobs/8279752?gh_jid=8279752
- Other examples included roles in Ireland and London, plus US and Canada; **not** proof of Israel coverage.
- The existing Greenhouse parser accepts the sample job fields and the `greenhouse.io` application link shape.

## Important limitations
- This was a live **read-only** endpoint inspection, not an automated production fetch, independent link-click validation, or a reuse license review.
- Do not claim all 28 postings are still open; API returned 28 records when inspected.
- Do not activate UI, API routes, scheduled scraping or bulk ingestion based on this check.
- Lever candidate API endpoints were inaccessible from the inspection environment, so remain unverified.
- Before enabling, verify employer/source usage rights, request budgets, server-side allowlist, result quality, link health, geographic coverage, and feature-flag rollout.

This document and candidate registry are discovery-only; zero user-facing changes and zero paid providers.
