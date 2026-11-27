# Job Radar foundation

Development only. No sender, scheduler, email provider, live database changes, or production deployment is included.

Apply `supabase/migrations/20261127090000_job_radar.sql` to an isolated development Supabase project before testing authenticated saves. The UI fails closed on database errors. Use existing account sign-in; guests and unverified or anonymous accounts cannot save consent. No guest consent is silently transferred after login.

The invitation appears once per browser after explicit search links are prepared (not proof of matching listings). Existing preference records suppress it across signed-in devices. Browser storage blocks repeated invitations, including after “Maybe later”; the permanent Job Radar control remains available. Clearing storage may allow an invitation again for guests. No private data is stored in this marker.

Both languages show the requested invitation and a preference editor. Saving requires the explicit “Enable and save” action with the consent statement above it. Version `job-radar-v1` refers to that Hebrew/English statement in `components/job-radar.tsx`; bump the version and migration validation when consent scope changes. The server records timestamp, preferences, language, frequency and an immutable event atomically. Only the owning user can read these rows. Disabling uses persisted preferences even if the editor has incomplete fields. Every disable records revocation; a future sender must require enabled=true, current consent and a verified account email. There is currently no sending path.

Checks:
- `npm test`
- `npx tsc --noEmit`
- `CARVIO_QA_NODE_MODULES=/path/to/qa/node_modules node tests/job-radar-database.mjs` (PGlite)
- `npm run build -- --webpack` (the shared local dependency symlink is incompatible with Turbopack).

Browser QA remains outstanding: managed preview injected Vite-only `--host`/`--strictPort` flags into Next.js, so it could not start. Hebrew/English and responsive layout are implemented but not visually verified. Check invitation timing and suppression, guest guidance, authenticated save/reload, edits, revoke/reload and failed save at desktop and 390px widths before release.

## Selection foundation (2026-11-27)

`lib/job-radar-selection.ts` consumes an enabled, explicitly consented subscription's saved preferences, trusted server-side board snapshots and that user's confirmed sent history. It reuses existing Greenhouse/Lever normalizers and bilingual role/country helpers. It chooses up to five distinct direct postings, newest first, requiring an explicit country/city match and conservative seniority match. Current snapshots must be no older than 15 minutes; original publication must be within 14 days. Unknown publication dates, ambiguous location or seniority, malformed source payloads and search links are excluded. These conservative filters can reduce coverage. Hebrew city aliases cover Tel Aviv, Jerusalem, Haifa, Berlin and Amsterdam; other cities match literally. Role aliases are limited to existing search dictionaries.

**Live integration is blocked:** the existing candidate board list explicitly lacks confirmed reuse permissions. The production approval list is therefore empty and returns `no_authorized_source`; no live calls or guessed listings are used. An approval reference must come from trusted configuration, never browser input. Snapshot collection still needs approved boards, timeouts, caching and request budgets before activation. Membership in a fresh board snapshot is the activity signal, not a guarantee that an employer will keep the posting open later.

The function receives already-loaded per-user preferences/history; it does not query production users, persist deliveries or mark selections as sent. A future sender must load complete confirmed-delivery history securely and record actual successful deliveries; unavailable history blocks selection. There is no batch runner, UI change, scheduler, sender or production migration in this step.

Validation: `node --test tests/job-radar-selection.test.mjs`: 6 passed. `npm test`: 239 passed; four existing component test files could not load because React is not installed in this fresh workspace. `git diff --check` passed. No live-source, database, browser or full TypeScript validation was performed for this pure selection step.
