# Local workspace account protection — 2026-11-25

The existing workspace stores applications, contacts, documents, profile, search criteria and other state in shared local-storage keys. Twelve separate React persistence effects run after hydration. Moving these keys to per-account namespaces safely requires coordinated migration and changes to cloud ownership/recovery code; this patch does not attempt that migration.

## Bounded protection

`WorkspaceAccessGate` mounts before the main workspace. It resolves authentication and the local owner marker before allowing local-data hydration. A signed-out user or a different account cannot mount an owned workspace. Authentication and cross-tab ownership changes re-evaluate access and unmount sensitive workspace state. The owner can sign in again to recover access. Public `/find` search remains available from the locked screen. There is no continue-local bypass for an owned workspace.

Unowned guest data remains available locally. On its first authenticated opening, the local owner marker is assigned to that account; data stays in place and is never uploaded by this gate. Storage or authentication verification failures fail closed. Demo mode keeps using its separate session storage and does not claim the real workspace.

## Validation

Five new unit tests cover existing guest data, ownership assignment without data mutation, logout, different-account login, original-account return, denied storage and cross-tab ownership changes. Full unit suite: 147/147 passed. TypeScript, changed-file ESLint and production build passed.

Added `tests/workspace-access-browser.mjs` for English desktop and Hebrew mobile fixtures: locked initial load, no private DOM, unchanged local records after reload, correct direction/no overflow and public search access. Local execution is blocked because Playwright browser binaries are absent and `/usr/bin/chromium` points to a missing executable. Run in CI with installed Chromium; authenticated account transitions still require controlled real-account validation.

## Explicit limitations

This is an access lock, not a full per-account storage migration. A device with an owned local workspace must use its original account to access that workspace; another account can use public search but cannot create a second local workspace on that browser profile yet. Browser local storage is not encrypted; this does not protect against direct device/developer-tools access or compromised same-origin scripts. Legacy unowned local records cannot be assigned retrospectively to an unknown historical account. Authentication absence and failure deliberately prevent exposure of already-owned data.
