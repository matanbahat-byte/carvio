# Active session telemetry repair — 2026-11-25

Root cause: the collector emitted a heartbeat every minute, including hidden
and unchanged sessions. Its 15-second counter counted indefinitely while a
tab stayed focused, even without interaction, and lost short visits.

The collector now uses a monotonic clock, samples foreground/focus transitions,
and stops counting 60 seconds after the latest pointer, keyboard, scroll, or
touch interaction. Initial foreground reading time receives the same 60-second
window. Delayed timers cannot add time beyond that window. Heartbeats are
emitted only if the whole-second active total has advanced; they remain technical
telemetry, not meaningful actions. Event names and database schema are unchanged.

Behavioral tests cover short visits, background tabs, idle timer suspension,
resumed interaction and focus switching. No historical records are modified.

Limits: this patch does not add anonymous ingestion or solve session identity,
per-user attribution or full-navigation cumulative duration. Session reporting
must not infer duration from heartbeat count. Multiple windows are distinguished
by focus; this is not a distributed cross-browser locking mechanism. Real-browser
and deployed collection verification remain release gates.
