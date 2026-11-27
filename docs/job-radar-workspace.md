# Job Radar workspace management

Development only; no production migration/deployment, real sending or participant enrollment.

Existing JobRadar preference editor and the workspace job-capture/application tracker are reused. The workspace now shows the saved subscription status, search criteria and frequency, distinguishes a prepared subscription from an enabled pilot, and offers direct pause/stop. Both pause and stop disable alerts through the existing consent RPC, retain saved criteria and require explicit re-enabling. No automatic resume is scheduled. Closing the editor discards unconfirmed changes; stop uses the last persisted criteria. Existing SQL cancellation and the global pilot gate remain authoritative.

`get_job_radar_workspace()` is an authenticated owner-only invoker wrapper around a private definer function with fixed empty search path and verified-account checks. It takes no user ID and returns at most twenty unique listings, newest first, from that owner's accepted live dispatches. Dry runs, pending and uncertain sends are excluded. Tokens, addresses, provider IDs and other users' histories are never returned. Withdrawn subscribers can still review their past sent jobs. Closed/expired listings remain visible with an unavailable message.

The workspace's Save or manage application action opens an existing application by canonical source URL, or prefills the existing capture-review form with real listing details. Actual saving follows the existing review/confirmation and cloud sync path. Closed listings can open a previously saved application but cannot start a new save. The standalone preferences page links back to the workspace for these actions.

History failure is distinct from an empty inbox. Browser auth changes clear the previous account's data; stale loads/saves cannot update another account's panel. All presentation is Hebrew/English, RTL/LTR and turquoise/mint. No new sender, scheduler or tracking endpoint is introduced; no refactor or paid dependency.

Validation: 294 automated tests pass, TypeScript and webpack production build pass. Actual isolated Supabase transaction tests verify owner history, peer/anonymous denial, no unsent records or token leakage, alongside the existing consent/attribution/dedup checks. Fixtures roll back. Browser tests use a fictional mocked account/history at 390px and 1280px in Hebrew and English, checking no horizontal overflow, history display, save preferences/frequency, cancel restoration, stop retaining criteria and reuse of the workspace capture-review modal. Browser fixtures do not represent actual emails or participants.

Production still lacks these development migrations/routes and the prior live-pilot blockers remain. The two-participant pilot remains OFF. Current real history is empty: no messages have been sent.
