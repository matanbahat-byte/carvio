# P0 search quality audit — 27 November 2026

Baseline: `main` at `32be4c88b9d9f87349cb7c348ba9181559364814`. Existing PR #105 benchmark and PR #107 provider-country implementation/tests were reused and extended; the resume-search functionality already on main was retained. No new feed, scraper, AI, service, schema or search controls.

## Reproduced defects and focused corrections

1. **Role semantics diverged by destination.** A Hebrew Supply Chain Manager search automatically included Director/Head titles, while the employer-career route omitted alternatives and most Hebrew searches had no English equivalent. Separate Manager from Director suggestions, retain the existing nearby-title suggestions, add only exact known bilingual equivalents, and use the same role terms/profile for LinkedIn, Indeed, Google and employer-career searches. Unknown titles remain literal; explicit alternative titles remain available in the existing workspace controls.
2. **Country routing fell back to the US market.** Hebrew Belgium/Canada and lowercase English entries missed the public page's partial mapping; Ireland/Australia/Italy lacked provider mappings. Reuse #107's explicit Hebrew/case-insensitive routing and extend those three supported markets. Keep literal location criteria and do not infer geography. Shared provider routing also fixes existing workspace/home links and company-search routes.
3. **Saved search pages and duplicate postings looked like jobs at home.** A seeded saved LinkedIn search was labelled Open original job and two URLs of one posting occupied two cards. Reuse existing URL validation/identity, deduplicate display only, keep invalid/search entries accessible in the tracker, reject known ATS board roots as individual postings, and clarify that active application status does not verify listing availability. No saved records are deleted or rewritten.

## Measured comparison

Twenty fixed role/country/city inputs in `tests/fixtures/search-quality.json`, covering 13 countries, Hebrew/English titles and Junior/Senior/Director/VP levels. Baseline: 20 real form submissions, alternating mobile/desktop and UI language. Candidate: every input in both languages at 390px and 1366px, **80 real form submissions**. All generated destinations, checks and original inputs are recorded in `before.json` and `after.json`.

| Check (20 distinct cases) | Before | After (all four contexts) |
| --- | ---: | ---: |
| Indeed destination matches requested supported country | 13/20 | 20/20 |
| Expected role/equivalent appears in LinkedIn, Indeed and careers query | 10/20 | 20/20 |
| No unrequested Manager → Director/Head expansion in sampled titles | 18/20 | 20/20 |
| Career query retains the same role alternatives as LinkedIn | 10/20 | 20/20 |
| No horizontal overflow | 20/20 | 20/20 |

Saved-job fixture, Hebrew/English × mobile/desktop: previously three links labelled original jobs (two for the same posting, one a search). Now one original-posting link; the search entry remains editable in the tracker. Closed applications remain excluded. Raw home evidence is in `home-before.json` / `home-after.json`.

## Source availability and limits

Twenty ordinary HEAD requests, one selected destination per search, returned 12 HTTP 200, three HTTP 403 and five HTTP 500 in the baseline run (`external-status.json`). No challenge/sign-in barrier was bypassed. HTTP success is not a count of relevant or active jobs; blocked/error destinations are inconclusive, not proof that the generated URL is broken. A second snapshot is recorded separately where available.

The existing bounded availability checker was also exercised against Greenhouse's official public API (`live-availability.json`): an observed Deliveroo posting was published, a deliberately nonexistent test ID was absent, and LinkedIn search remained unsupported/unknown. No new availability mechanism was introduced. A job can subsequently close.

**The verified improvement is in query construction, market routing and honest/deduplicated saved-job display. We did not establish more relevant returned listings, more active listings, better ranking, or improved conversion.** External search results depend on the provider and may require user sign-in. Home shows the user's saved applications and personalized external searches, not an invented recommended-job feed.

## Validation

246 unit tests; TypeScript/production build; full ESLint; 80 search browser cases; four before/after home cases. Existing search resume, sharing, handoff, ATS capture, accessibility and contextual-tool browser regressions are retained. CI reruns the search audit/home scenarios alongside the full existing quality suite; current status is available on the PR checks.

Provider references: [Indeed countries](https://www.indeed.com/countries), [Greenhouse board URL structure](https://support.greenhouse.io/hc/en-us/articles/360020776251-Job-board-URL-for-Greenhouse-hosted-job-board).
