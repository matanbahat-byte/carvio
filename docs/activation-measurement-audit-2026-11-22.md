# CARVIO activation and measurement: verified baseline (2026-11-22)

This is a **read-only audit and acceptance checklist**, not a claim that search quality or production analytics have been fixed.

## Observed evidence (Supabase JobFlow)

- 2026-11-22 (Israel time, partial day): 206 product events, 2 distinct identified user IDs.
- 179 of those events are `session_heartbeat` from one identified user. Do **not** equate event counts with people, sessions or pageviews.
- 4 `session_started`, 7 `screen_viewed`, 1 `search_submitted`, 4 `search_opened_by_source`, 1 `return_visit` events.
- `public.profiles` has 54 rows total, with zero rows created on Nov 22 at query time. Profiles are not independently verified Auth signups.
- No `public.applications` rows created Nov 15–22; this does not prove no local-only saves.
- Vercel analytics access was not verified; project name `carvio-pi` returned 404 in the connected account.

## Release gates (do not bypass)

1. **Search activation:** On Hebrew and English, a user enters role, country and optional city and receives an obvious next step without registration or jargon. Test desktop and mobile.
2. **Result quality:** Test real, permitted sources for software engineering in Israel and additional distinct job/location pairs. Reject category pages, stale/unverifiable listings, incorrect country/city and duplicate posting IDs. Never label a source as a verified in-app listing if only an external search link exists.
3. **Analytics integrity:** Dashboard must show distinct users, sessions, heartbeats, searches, result clicks, saved jobs and return visits separately; exclude known internal/test IDs from acquisition reports without deleting source events. Avoid inferring session duration from heartbeat count alone.
4. **Funnel:** Track `search_submitted` → results actually displayed → individual listing opened → saved/added to tracker → return within 7 days. Each event must be deduplicated and have a documented definition. No PII in event properties.
5. **Attribution:** Capture consent-respecting UTM/referrer on first meaningful visit, with explicit unknown category. Do not attribute traffic to outreach emails until an approved community post actually links to the site.
6. **Deployment:** Run automated tests and preview browser smoke on desktop/mobile; inspect CI and Vercel preview checks. No production merge without green verification.

## Read-only baseline SQL

```sql
SELECT (created_at AT TIME ZONE 'Asia/Jerusalem')::date AS local_date,
       event_name, count(*) AS events, count(DISTINCT user_id) AS identified_users
FROM public.product_events
WHERE created_at >= timestamptz '2026-11-15 00:00:00+02'
GROUP BY 1, 2 ORDER BY 1, 2;
```

## Prioritization

P0: search relevance and truthful source labeling; P0: measurement denominators and internal/test isolation; P1: one-click save/return flow; P1: attribution and day-1/day-7 retention cohort reporting.

**Next implementation PRs should be small and independently verifiable.** This document deliberately makes no production code or schema changes.
