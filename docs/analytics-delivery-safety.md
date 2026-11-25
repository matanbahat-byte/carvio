# Analytics delivery safety

The client collector is optional: blocked browser storage, a rejected authentication lookup, rejected network sends and failed acknowledgement persistence cannot reject the user's action. Temporary storage failures lose continuity/attribution across reloads; they do not block the product.

Queued rows receive their authenticated owner and UUID on enqueue. Account changes clear pending rows. A failed in-flight batch is never reassigned or restored after an account transition. Initial authentication lookup results are ignored after a newer auth callback. Last-return dates are scoped per account. Active-time state starts again for a newly authenticated account.

Retries use the same explicit row IDs with `upsert({onConflict: id, ignoreDuplicates: true})`. The existing UUID primary key and owner RLS policy are reused, with no schema change. This prevents retry duplication when the first write succeeded but its response was lost; it does not deduplicate independently emitted interactions or cross-tab instrumentation.

This collector remains authenticated-only. Interactions occurring before the authenticated owner is known are deliberately dropped rather than assigned to whichever account signs in later. Anonymous collection still needs a separate secure endpoint/schema design. The bounded in-memory queue retains at most 100 events; closing the tab, overflow and prolonged network failure may lose telemetry. No durable/offline delivery guarantee is claimed.

Production acceptance still requires authenticated browser/database checks of inserts, retries and RLS. The transport tests simulate failures and ownership changes; they do not substitute for those checks.
