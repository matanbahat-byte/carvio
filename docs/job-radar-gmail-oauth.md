# Job Radar dedicated Gmail authorization

Development implementation, 27 November 2026. Sending remains OFF. The existing
`app/auth/callback` and all site sign-in components are unchanged.

## Implemented

- Dedicated server routes `/api/admin/job-radar/gmail` and
  `/api/admin/job-radar/gmail/callback`. They return 404 unless explicitly enabled.
- Operator key supplied in a password POST body, checked with constant-time hash
  comparison; same-origin POST only, 2 KiB streaming body limit. Never put this key
  in a URL, Git, chat, browser storage, or client-side environment variable.
- Ten-minute random state, hashed browser binding in a Secure/HttpOnly/SameSite=Lax
  host-only cookie, PKCE S256, atomic single-use state deletion in Postgres.
- Only `openid`, `email` and `gmail.send`; reject missing scopes and broad mailbox
  permissions. Offline access, explicit consent and CARVIO account hint.
- Verify exact `carvio.team@gmail.com` identity and verified email both before and
  after a real token refresh, then persist only authenticated encrypted refresh
  credentials. No Gmail send endpoint exists in this provisioning path.
- AES-256-GCM with a server key outside Postgres, fresh IV and associated sender,
  OAuth client, origin and purpose. Stored ciphertext cannot be moved to another
  client/origin/purpose. No access tokens or client secrets persist in the database.
- RLS plus revoked anon/authenticated grants; service-role-only credential/state
  tables. Read adapter validates client, sender and known token expiry before
  decrypting for a future explicitly enabled runner.
- No-store, no-referrer, frame denial, restrictive CSP, no external resources on
  the callback, generic errors and no credential/provider-payload logging.

## Isolated backend

Only `https://pzykndfxenwqnpvrbkby.supabase.co` is accepted in this version.
The two new tables were created on this development backend and verified with
transaction-local rollback fixtures. No OAuth credentials or real consent rows
were inserted. No production schema changes were made. The migration file is
included for review/release; development DDL was exercised through SQL rather
than recording a release migration history entry.

## Deployment configuration (all server-only)

Use one isolated preview, fixed HTTPS origin, and branch-scoped secrets. Do not
change the existing public Supabase/login configuration.

| Variable | Value / handling |
| --- | --- |
| `RADAR_GMAIL_SETUP_ENABLED` | `false` until the preview, database and secrets are ready; temporarily `true` for owner connection, then `false` again |
| `RADAR_GMAIL_OAUTH_ORIGIN` | Exact HTTPS preview origin, no trailing slash/path; never derive from forwarded host headers |
| `RADAR_GMAIL_CLIENT_ID` | Dedicated sender OAuth client, not the existing Carvio Web sign-in client |
| `RADAR_GMAIL_CLIENT_SECRET` | Newly rotated client secret, entered directly in hosting secret storage; do not reuse the secret shown in chat |
| `RADAR_GMAIL_ENCRYPTION_KEY` | 32 random bytes encoded as base64url; sensitive hosting secret, outside Postgres |
| `RADAR_GMAIL_SETUP_TOKEN` | At least 32 random bytes as base64url, entered directly by owner in the setup form; sensitive hosting secret |
| `RADAR_SUPABASE_URL` | The isolated development URL above |
| `RADAR_SUPABASE_SERVICE_ROLE_KEY` | Isolated backend service-role key, sensitive hosting secret, never a production key |

The encryption key must survive redeployments and be backed up in the approved
hosting secret store. Losing it requires reconnecting Google. Rotating the key or
changing the origin/client requires an explicit reconnect/migration; do not silently
overwrite the key. Expired state is cleaned during authorized setup. Retained
expired state contains hashes and ciphertext, not plaintext codes or verifiers.

## Remaining owner handoff / release gates

1. Reconcile the preview base with current main before any production release.
   Configure server secrets directly in hosting; no secrets in chat. Verify the
   deployed setup GET/POST/callback responses and public role denials.
2. In the dedicated Google client, register exactly
   `<verified-preview-origin>/api/admin/job-radar/gmail/callback`. Keep JavaScript
   origins empty. Do not change Carvio Web or the shared login scopes/settings.
3. Replace/disable the secret exposed in chat using Google's actual available
   controls. Never delete the existing site sign-in client. An additional secret
   alone does not disable the old one; independently verify old-secret invalidation.
4. Verify Gmail API, consent audience, the exact owner test account, allowed scopes
   and token lifetime in the actual Google project. Testing status can cause
   seven-day refresh-token expiry; a null returned expiry is not proof of indefinite
   validity. Do not alter shared app publishing status without reviewing sign-in
   impact. Do not enable billing or a paid service.
5. Owner opens the deployed setup page, enters the operator key, selects only the
   CARVIO account, and approves scopes. The callback verifies refresh and saves
   encrypted credentials; confirmation explicitly says sending remains OFF.
6. Disable the setup flag. Verify stored metadata only (sender/client/scope/time),
   never select or print tokens in operator logs. The current dry-run worker stays
   dry-run-only; no scheduler/live runner is connected by this change.
7. Existing user consent, actual cohort/source checks, final dry-run and separate
   controlled sending release gates still apply. OAuth connection is not pilot
   activation and not participant consent.

## Validation

Twenty focused Node tests cover successful provisioning and refresh, fixed sender,
wrong/unverified account, exact scopes, missing refresh, expiry, denied consent,
wrong browser/state, duplicate cookies, replay/concurrent callbacks, PKCE, encryption
tampering/client/origin binding, input limits and provider/storage failure. All
external requests in these tests are mocked. SQL rollback tests on the real
isolated backend cover grants, RLS, atomic consume, expiry, sender constraint and
pilot OFF. No test invokes a real Gmail endpoint.

Security advisor's two new INFO no-policy notices are intentional deny-all RLS;
anon/authenticated grants are also revoked. Existing consent-RPC WARN is unchanged.
See [deny-all RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [existing definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

References: [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Google security guidance](https://developers.google.com/identity/protocols/oauth2/resources/best-practices).
