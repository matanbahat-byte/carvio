# Google search repair — 2026-11-06

Google was presented under a vague broader-sources label. Its query also required an exact title in the page title and quoted location terms, combined with a date filter. These restrictions could exclude relevant listings.

The search results screen now explicitly offers LinkedIn and Google. Google uses role and location keywords, with separate links to company career pages and an all-time fallback. Explicit user preferences remain in the query. Career-page searches omit the date restriction because permanent career pages may not have been indexed recently. Provider cards are selected by stable IDs rather than array positions.

Validation: 64 tests passed, production build passed, and targeted ESLint passed. Local production UI was exercised on port 3030 using a fictional Senior HR Business Partner / Tel Aviv / Israel search. The generated Google link visibly returned results from multiple sites, including Built In and Get A Job. This verifies external navigation and returned search results; it does not verify that every listing is active or an exact match. Google remains an external search destination, not an embedded or verified job feed.

Prepared locally only; publication requires the user's separate approval.
