# Search funnel analytics (2026-11-19)

## Events

- `screen_viewed` with `screen=search`: search page viewed.
- `search_submitted` with `method=standard|broadened`: user generated a new set of outbound search links.
- `search_sources_presented` with `count=4`: CARVIO presented LinkedIn, Indeed, Google and company-career search routes; **not** a count of returned job listings.
- `search_opened_by_source` with `sourceType`: outbound search link opened (existing instrumentation).
- `opportunity_saved`: an opportunity/application saved (existing instrumentation); not necessarily attributed to a search.

CARVIO currently opens external job-search providers. It cannot observe the number of listings displayed or clicks on individual job postings *inside* LinkedIn, Google, Indeed or a company's site. Do not label source-route clicks as individual job clicks or source presentation as actual search results.

The current product-events pipeline persists events for authenticated sessions only. Therefore these counts exclude anonymous traffic and should not be reported as total visitors. The same user can generate multiple events. Heartbeats are not user actions.

## Read-only funnel query

```sql
select event_name, count(*) as events, count(distinct user_id) as identified_users
from public.product_events
where created_at >= (date '2026-11-19' at time zone 'Asia/Jerusalem')
  and created_at < (date '2026-11-20' at time zone 'Asia/Jerusalem')
  and event_name in ('screen_viewed','search_submitted','search_sources_presented','search_opened_by_source','opportunity_saved')
group by event_name
order by event_name;
```

Filter `screen_viewed` to `properties->>'screen' = 'search'` when computing search page views. Use the `sourceType` property to break out LinkedIn, Google and Indeed. Company-career links currently use Google as the underlying provider; distinguish them in a future iteration if needed. Do not infer funnel conversion from event counts without user/session joins and clear attribution.

## Validation checklist

1. Log in with a test account on a preview deployment.
2. Open Search; confirm one `screen_viewed` event for the screen transition.
3. Run a standard search; confirm one `search_submitted` (standard) and one `search_sources_presented` (count 4).
4. Broaden search; confirm corresponding events with method broadened.
5. Open each source route; confirm `search_opened_by_source` with the appropriate provider.
6. Save an opportunity; confirm `opportunity_saved` and verify no personal job-query text is sent in event properties.
7. Verify that no test events are interpreted as organic user traffic.

This change adds no database tables, changes no RLS policies, and does not enable analytics for anonymous visitors.
