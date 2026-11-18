# Multi-source search discovery

The search page now exposes LinkedIn, Indeed, Google web search and a dedicated company-careers route. All routes open external results; they do not fetch or aggregate job listings inside CARVIO.

## Behavior

- Users can explicitly select or enter up to four alternative job titles. These are OR alternatives, while required skills remain AND constraints. Preferred skills remain unfiltered. Suggestions cover a limited set of role families and are never silently added. Changing the primary role clears its old alternatives.
- Search snapshots and unsupported-filter disclosures remain intact. Every title/filter edit invalidates previously generated links. Saved preferences support an explicit resume action after reload, without pretending an edited draft is a previously submitted search.
- After opening an external source, users get an inline URL capture entry point. Existing review, source verification, editable fields and save confirmation are reused.
- Duplicate detection recognizes LinkedIn job IDs across country hosts, title slugs and referral tags, and Indeed job IDs across country hosts. Original saved source URLs remain intact. Distinct job IDs stay distinct. Cross-provider duplicates without shared IDs are not inferred.
- Company-careers search uses Google with no time restriction and clearly discloses that the route is external and lacks native seniority, employment and radius filters.

## Validation

103 automated tests passed, including multi-source title propagation, required keywords and exclusions, Hebrew/English rendering, opt-in suggestions, migration, invalidation, and job identity regressions. Final production build passed, including TypeScript validation and static page generation.

Browser QA is blocked by the managed preview launcher: it appends Vite flags (`--host`, `--strictPort`) to `next dev`, which rejects `--host`. No working app configuration was changed to compensate. Actual source-side ranking, filter enforcement, live listing coverage and mobile interactions remain unverified.

## Remaining work for an aggregated results engine

A supported job/search data integration is still required to display live listings from multiple sources within CARVIO. No such feed, provider credential or new billable integration was configured in this change. Do not advertise native LinkedIn results aggregation, comprehensive coverage, guaranteed filter enforcement, new-job counts or fit ranking from this implementation.

No production deployment, database changes or authentication changes.
