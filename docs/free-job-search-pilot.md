# Free employer-board search pilot — foundation only

This branch adds **pure parsing helpers and fixture tests** for public Greenhouse and Lever job-board endpoints. It does **not** enable search, fetch external data, change user data, or require a paid provider.

## Constraints before activation
- Confirm each employer's public board token and reuse rights; only explicitly approved boards may be queried.
- Server-side allowlist only: never accept arbitrary board tokens or URLs from the browser.
- Add server-side timeouts, cache, rate limits and a global request budget before any live calls.
- Validate source-specific URLs and retain a direct application link, attribution and original posting date when available.
- Test real listings for five role families across Israel and Europe, including local/non-remote positions.
- Keep existing LinkedIn/Indeed/Google external search available; do not imply that those results are in-app.
- Avoid storing or logging searcher identity or sensitive query data unnecessarily.
- Measure relevance, broken links, duplicate rate and coverage against the existing external-search flow.

No cost-bearing vendor, credential, scraper or live API integration has been enabled.
