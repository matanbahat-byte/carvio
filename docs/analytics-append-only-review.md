# Append-only product events: release proposal

Status: **prepared, not applied, not database-verified**.

## Verified evidence and scope

The current repository bootstrap and the production policy snapshot supplied by the root audit both contain `Users can manage their own product events`, command `ALL`, with `auth.uid() = user_id` as USING and WITH CHECK. That permits authenticated users to update or delete their own telemetry. It prevents cross-account access but does not preserve analytics history against client edits.

`docs/sql/product-events-append-only.sql` replaces that policy with authenticated own-row SELECT and INSERT policies. It changes no event rows, table columns, workspace policies, account permissions or grants. It aborts for missing RLS or unexpected policy names; unknown permissive policies must be reviewed because PostgreSQL combines them. The bootstrap is deliberately unchanged until the proposal is approved. The paired manual rollback restores the original ALL policy and never deletes records.

Service roles and database owners can bypass RLS. Auth deletion may still cascade to event deletion, as the existing foreign key specifies. This proposal does not claim immutable storage against administrators or retention obligations.

## Stable UUID retry compatibility

Delivery commit `97f3be8` sends client-generated stable `id` UUIDs through Supabase `upsert(rows, { onConflict: 'id', ignoreDuplicates: true })`. PostgREST maps ignore-duplicates to INSERT ON CONFLICT DO NOTHING, which does not update existing rows. The INSERT policy permits a row only when its user_id equals the authenticated subject. Own-row SELECT supports acknowledged reads and any returned representation. There is deliberately no policy for the DO UPDATE form of upsert.

A retry of the same ID cannot create another row and does not require permission to update history. A distinct falsely emitted interaction still receives a distinct ID; retry deduplication does not validate event truth. Client-supplied created_at/properties remain self-reported and can be fabricated. Trusted server-side event validation is independent future work.

## Validation gate before applying

Use an isolated Supabase/database copy with two controlled authenticated accounts. Inspect table grants, RLS and *all* existing policies first. Create the actual migration with the Supabase CLI migration command, copy the reviewed proposal into that generated file, then validate its transaction and repeat it to check idempotence.

Using real JWTs through the same PostgREST API as the browser, verify:

1. Account A inserts an event with a stable UUID and user_id A. It reads back once.
2. Retry the identical payload using `resolution=ignore-duplicates` / `ignoreDuplicates: true`: successful acknowledgement, still one row, unchanged content.
3. A cannot insert user_id B, read B rows, change its own event or delete it. UPDATE/DELETE may return zero affected rows rather than an HTTP error: verify the stored row remains unchanged.
4. B cannot read, alter or delete A rows. Repeat tests signed out.
5. Existing production-style plain INSERT and new retry upsert both work. Capture client/API errors and row-count evidence without personal data.
6. Snapshot aggregate row counts before/after migration: no records lost. Apply rollback only on the isolated copy; verify former own-row policy returns and counts remain unchanged.

No PostgreSQL executable or local database is available in this workspace, so SQL execution and PostgREST compatibility remain unverified here. This is **No-Go for automatic production application** until the controlled tests and explicit release approval are complete. Do not use syntax-string tests as a substitute for an actual RLS test.

## Known profile/schema drift

Root's live audit found 60 Auth accounts, 59 profiles and one cloud workspace. Live profiles expose SELECT and UPDATE policies only; repository bootstrap additionally defines INSERT. Production has an `applications` table while the bootstrap names `job_applications`. The workspace snapshot already contains 11 applications, so an empty standalone applications table does not prove no persistence.

Do not rerun `schema.sql` to repair this drift or blindly add client profile insertion. Inspect the live signup trigger/function and the missing account in a separate authorized repair. This proposal deliberately does not alter profiles, applications or workspace data.


## Documentation verification (2026-11-25)

Reviewed the current [Supabase changelog](https://supabase.com/changelog.md). Recent CLI v3 local-default and hosted-confirmation changes reinforce generating a migration via discovered CLI commands rather than inventing a filename. No hosted branch merge or CLI operation is proposed here. Checked [JavaScript upsert](https://supabase.com/docs/reference/javascript/upsert), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [PostgreSQL INSERT privileges](https://www.postgresql.org/docs/17/sql-insert.html). The client package source additionally maps `ignoreDuplicates` to `resolution=ignore-duplicates`. Runtime behavior must still pass the isolated API acceptance checks above.
