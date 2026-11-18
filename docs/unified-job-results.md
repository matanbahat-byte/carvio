# Unified job results — limited pilot, disabled by default

## What is implemented

A server-side SerpApi Google Jobs adapter returns normalized job listings and their actual `apply_options`. This is an indirect search-index integration, not a native LinkedIn API integration. LinkedIn appears only when a returned application URL actually belongs to LinkedIn. Coverage is partial and no per-search LinkedIn coverage is guaranteed.

The search UI offers an explicit “Show jobs here” action only when the server capability is configured. External LinkedIn/Indeed/Google/company routes remain available independently. Results include company, location, source links, provider-supplied posting date, description and editable capture into the existing save workflow. Alternatives and required keywords enter the provider query; title/skill/location evidence determines local ordering without a displayed fit percentage. Missing requirements and excluded terms are surfaced for review, never treated as proof of suitability. Job descriptions are rendered as text.

Source filtering lists only sources actually returned. Relative English dates can be filtered against the selected window; missing/unrecognized dates remain visible with uncertainty. Radius, seniority, employment and industry enforcement are not promised. Publication is not verified merely because a result was returned. Existing Greenhouse/Lever availability checks remain part of capture review.

Deduplication uses a shared application URL identity or provider job ID, keeping distinct postings with identical titles separate. Multiple real source links remain on each card. Saving checks every source against existing saved job URLs before opening the review dialog. No application is submitted automatically.

## Activation prerequisites

The existing deployment is on Vercel. Configure these only in a private preview initially:

- `SERPAPI_API_KEY`: server-only SerpApi credential. Never use a `NEXT_PUBLIC_` prefix or put a real key in source control, PRs, screenshots or chat.
- `JOB_SEARCH_ENABLED=true`.
- `JOB_SEARCH_ALLOWED_USER_IDS`: comma-separated Supabase user IDs approved for the pilot. Empty means unavailable, not open access.
- Existing server Supabase URL/anon configuration must be present. Every paid-provider POST verifies the current user with server-side `auth.getUser()`.

Before enabling, the owner must select/approve the provider account and its quota/budget. Do not create a subscription, accept paid terms, turn on automatic upgrades, or assume an existing paid allowance. This branch does not configure any provider account or secret, and makes no live provider requests during tests.

The capability is off if any configuration prerequisite is missing. No new database tables, migrations, RLS changes, or service-role credentials are introduced. No user email, CV, personal profile, contact list or user ID is sent to SerpApi: only target titles, explicit search keywords, work model, location and language. The provider's own retention/terms need review by the owner when authorizing its account.

## Quota controls and limits

Same-origin authenticated requests only; explicit pilot allowlist; maximum 6 requests per user per minute; 60 new provider requests per warm server instance per hour; 10-minute bounded in-memory cache; identical in-flight queries coalesce; provider redirects are refused and requests time out after 12 seconds. These are **per-instance** limits and caches, not distributed guarantees. Enforce a hard provider quota with automatic top-ups disabled before any pilot. Before expanding public access, replace the pilot allowlist and in-memory limits with a durable global usage budget. Current configuration deliberately cannot silently open public access.

Unknown provider errors return an unavailable state, never fabricated zero results. Secrets and raw provider errors are not logged or returned. The browser never receives provider credentials. API responses are private/no-store; cached search results contain public listing data only, without authentication state.

## Demonstration and validation

Only explicit demo mode includes labelled fictional listings from reserved example domains. No sample results are served by the API or mixed with live results. Demo examples illustrate UI behavior; they do not establish real coverage or relevance.

114 automated tests passed during implementation, including normalization, malicious URLs, duplicate source identities, conservative explanations, provider request construction, parser bounds, cache/coalescing, limits and bilingual card output. Production build passed, including TypeScript and static generation. Browser QA status is recorded in the PR. Native TypeScript test imports use `allowImportingTsExtensions` with the existing no-emit configuration; no new dependencies are installed.

Live provider retrieval, authenticated allowlist access and real result relevance cannot be accepted until a provider credential is configured. Full mobile/browser coverage is not claimed. Do not deploy or enable this pilot in production before that validation.

## Provider documentation consulted

https://serpapi.com/google-jobs-api — `jobs_results`, `apply_options`, location/query/language and API-key parameters. Deprecated Google Jobs filter parameters were not introduced.
