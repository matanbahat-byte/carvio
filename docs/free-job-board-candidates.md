# Candidate free employer boards — 2026-11-20

**Status: discovery only.** These employer-hosted public Lever pages were accessible during research. The API endpoints have **not** been live-tested and reuse permission is **not** established. Do not import this list into a production route or activate fetching until checks below pass.

| Employer | Board token | Public page | Coverage observed |
| --- | --- | --- | --- |
| WalkMe | walkme | https://jobs.lever.co/walkme | Tel Aviv hybrid engineering, product, sales |
| Lendbuzz | lendbuzz | https://jobs.lever.co/lendbuzz | Tel Aviv hybrid engineering |
| Zadara | Zadara | https://jobs.lever.co/Zadara | Tel Aviv hybrid engineering |
| Welo Global | weloglobal | https://jobs.lever.co/weloglobal | Israel Hebrew language and remote jobs |
| airSlate | airslate | https://jobs.lever.co/airslate | Israel / European remote and strategy jobs |

## Activation gates
1. Verify exact official Lever API response and posting links for each token; reject dead or inaccessible boards.
2. Review terms, employer board reuse permissions and rate limits; no blanket permission inferred from public visibility.
3. Implement server-only fixed allowlist, short timeout, caching, per-source concurrency budget and graceful failures.
4. Test relevance for Israel and Europe across HR, supply chain, engineering, finance and marketing. Do not claim coverage where none exists.
5. Confirm link health and no duplicate listings, then ship behind a disabled-by-default feature flag.

No paid search provider, no live API calls, no browser-facing integration, and no deployment of search results in this change.
