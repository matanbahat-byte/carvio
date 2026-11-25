# Automatic cross-device synchronization hotfix

Base: production `6424ccb232d38849275d0d009e90e74f7b2c7e41` (PR #118). Branch: `fix/automatic-cloud-sync-20261125`.

## Confirmed cause

Production CloudAccount implements optional device backup, not automatic two-way synchronization. Authentication only queries whether a workspace exists. Automatic saving requires a browser-global opt-in flag and a prior cloud row; opening or refreshing another device never automatically restores data. Its unconditional upsert also permits stale devices to replace newer cloud data. The reported user's exact account/device state is not known; missing cloud data must not be treated as evidence that their local applications were deleted.

A read-only production inspection found one cloud workspace containing 11 applications. Live `user_workspaces` RLS is enabled and its USING and WITH CHECK both enforce `auth.uid() = user_id`. No production records or policies were changed.

## Implemented

- Automatic push/pull after authenticated access, refresh, return to a visible tab, network reconnection and every 30 visible seconds. Revision-only polling avoids re-downloading unchanged documents.
- Preserve explicit sync opt-out. Show local-only, pending, confirmed and failed sync states distinctly. Provide a local recovery download.
- First-device migration unions saved records instead of replacing the cloud with empty local state. Cloud preferences win initially; a recovery copy precedes replacing local content.
- Persist SHA-256 baseline digests, not duplicate document contents. Three-way merging preserves independent record/field edits and deliberate deletions. Concurrent conflicting edits remain untouched with a visible error; no last-writer-wins overwrite.
- Reuse the existing unshipped compare-and-swap helper and account-access gate. Writes are scoped to user ID plus server revision, insert collisions/stale writes re-read and merge, changes made during slow writes replay.
- The first authenticated account owns legacy local data. Signing out or switching to another account locks that owned workspace before private state hydration. It is preserved for its original account, not reassigned. A second account can use its own separate browser context; convenient multi-account local partitioning is outside this hotfix.
- A local-only reset disables synchronization and invalidates its baseline, so re-enabling merges cloud records back instead of treating the reset as cloud deletions.
- Keep the released light palette and all unrelated integration work excluded. No dependencies, schema migration, new service, notification or destructive operation.

## Verification

- Unit suite includes initial two-phone-application migration, desktop pull, contacts/saved searches, independent field edits, metadata timestamps, same-field conflicts, deletions, cancelled account requests, read failures, storage quota failure, slow-write replay and CAS races.
- `tests/cloud-sync-browser.mjs`: actual Playwright browser and installed Supabase client against an isolated in-memory Auth/PostgREST fixture. Phone adds two applications; desktop receives them automatically; desktop adds another; phone reload receives it; two further applications survive a slow request; a sixth survives offline/reconnect. Another account is isolated and a switched owned browser is locked without removing its five local records. No uncaught browser errors.
- `tests/cloud-sync-database.mjs`: actual ephemeral PostgreSQL engine runs the repository table/policy and CAS writer. Own rows round-trip; another user and signed-out role cannot read them; cross-account and stale writes fail; applications, contacts and saved searches survive.
- These are isolated behavioral/SQL tests, not a claim that the affected user's live account or a real Android handset was accessed. Real hosted Auth-account acceptance remains distinct from simulated authentication.
- CI runs lint, TypeScript, all units, build, visual regression, browser synchronization and isolated PostgreSQL acceptance.

## Release and recovery

Only the preceding visual release was explicitly approved for production. This data-synchronization release must be presented for final production approval after its candidate checks pass. Do not merge unrelated integration PRs.

After approval, deploy only this branch. Refresh the mobile browser first, using the same account, retain its local records and wait for “Synced to your account”; refresh the desktop and verify both applications. Never clear phone storage or manually replace its workspace with an older cloud backup. Previously open clients must refresh to stop running the old unconditional backup writer.

Rollback: revert this isolated package to the production base above. Cloud rows remain schema version 1 and readable by the old release, but the old release resumes optional/manual backup behavior. Recovery snapshots and current applications remain on each device. A rollback does not undo cloud merges.

Overall original 18-section mission estimate: 57%; no claim that the entire project or original cloud acceptance mission is complete.
