# Cloud snapshot safety — 2026-11-25

## Confirmed implementation issue

`CloudAccount` used an unconditional upsert and enabled automatic backup using a browser-global flag after only checking whether a remote row existed. Signing in on a fresh or stale device could overwrite an existing remote workspace before restoring it. The existing design is local-first snapshot backup, not automatic bidirectional synchronization. A missing row in `job_applications` does not prove that no jobs have been saved locally or in a workspace snapshot.

## Changes

- Existing cloud workspaces require an explicit restore before this component enables backup or automatic backup. Login and account changes reset the baseline and pause automatic backup.
- Initial backup is insert-only. A competing device that already created the row causes a conflict rather than an overwrite.
- Subsequent writes compare the authenticated user's ID and the exact `updated_at` baseline in the UPDATE predicate. A zero-row update pauses synchronization and asks the user to restore the newer cloud version.
- One in-flight operation per mounted component; concurrent devices/tabs still use the database compare-and-swap.
- Local workspace owner is claimed before upload, preventing that snapshot from being uploaded to another account after switching accounts. Deleting local data clears the owner while pausing backup.
- Restore validates the snapshot envelope and requires user confirmation. Before replacing local state, a recovery snapshot is saved in local storage under `carvio.cloud-recovery.v1:<prior owner>`; storage failure aborts restore.
- Automatic sync preference writes use an account-scoped key; legacy global flags no longer authorize automatic writes. Sync is intentionally paused on every new mount until the user restores and enables it.
- Network/storage failures preserve local data, pause automatic sync and show a visible 'Sync paused' state.

## Verification and limits

Behavioral tests exercise insert collision, stale concurrent writers, user predicates, network rejection, owner gating and invalid payload envelopes. This is a safe backup foundation, **not a claim of complete bidirectional sync**. Authenticated real-browser cross-device acceptance and live RLS checks are required before production release. No database migration or production changes are included.

The recovery snapshot is retained locally, not automatically merged or uploaded. After restore, the account panel offers a download of the previous local copy in the existing import-compatible JSON format. Deleting local data also removes retained recovery snapshots. Local workspace visibility remains the existing local-first behavior after sign-out; separate per-account local stores remain follow-up work. Auth profiles are not repaired by this change.
