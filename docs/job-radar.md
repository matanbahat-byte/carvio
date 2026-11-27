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
