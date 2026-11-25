# Preserve edits made during an in-flight cloud backup

The 1.4-second debounce could expire while a previous cloud write held the
operation lock. The attempted save returned early, and finishing the first
request did not retrigger the effect. The newest local edit remained unbacked-up.

The collector now tracks one pending serialized snapshot identity and acknowledges
only the snapshot actually sent. A successful write wakes the debounce if a newer
snapshot remains. The replay uses the newly acknowledged CAS revision. Equivalent
workspace objects from parent rerenders do not retrigger saves. Continuous editing
can schedule subsequent writes, but a completed unchanged snapshot cannot create
an automatic save loop.

Network and conflict failures continue to pause autosync without automatic retry.
Account changes, restore, sign-out, disabling autosync and unmount invalidate pending
work. Stale request completions cannot reauthorize synchronization after cancellation.
No cancellation can undo a request already accepted by the server; existing CAS and
ownership checks remain unchanged.

Deferred behavioral tests cover overlapping edits, failed writes, cancellation,
account transition, equivalent parent rerenders and reverting an edit while its
backup is still in flight. Real authenticated cross-device browser acceptance
remains a separate release gate.
