# Automatic synchronization without activation

Follow-up to production PR #119, base `7dd7115941481e45a64b1694b30380a5334eb07a`.

Authenticated workspaces always start synchronization automatically. Legacy v1/v3 device flags no longer disable it. The activation checkbox is removed; optional retry controls are for recovering an error, never a prerequisite. Normal changes save after a short debounce; opening/returning to the app loads changes automatically, with revision polling every 30 visible seconds. Anonymous device-only use still requires signing in to identify the account.

A deliberate local-only reset pauses synchronization for the current visit and clears the checkpoint/recovery. On the next visit, automatic safe merging restores cloud records, without interpreting the local reset as cloud deletion. Reset copy discloses this behavior. Ownership, field conflict checks, CAS and offline recovery are unchanged.

Regression browser fixtures preseed both legacy flags to off and verify two-device synchronization still begins without touching any sync control. An already-open desktop receives further phone applications without reload or a sync click. After local reset, reload automatically restores all six records without enabling a checkbox.
