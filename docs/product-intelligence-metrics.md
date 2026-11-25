# Product intelligence calculation contract

`lib/product-intelligence.ts` is an aggregate calculation foundation, not a deployed management dashboard. It accepts authorized exports and returns counts/rates without user IDs or personal details. It performs no database queries or writes.

## Trusted input and limitations

- The server-side caller must supply complete event and registration datasets for the requested observation period. An empty array means a verified empty dataset; `null` means unavailable. Partial exports must not be treated as complete zero values.
- `environment: production` and `actorKind: user` must be assigned from trusted deployment/account classification. Unknown classification is excluded; client-supplied labels alone are insufficient. Known administrator/test account IDs can additionally be excluded.
- The current historical event schema does not supply these classifications. Historical production exports require explicit verified classification before use. Do not fabricate it, infer it from activity volume, or claim this module makes current production reporting complete.
- Events require stable IDs and identified user IDs. Duplicate `(userId, id)` records are counted once. Anonymous visitors are outside registered-user North Star/retention calculations and need separate visitor reporting.
- `dataQuality` exposes counts of rejected duplicate, invalid, excluded or unclassified records; those rejected records must be investigated in the ingest/export layer. No individual record is returned.

## Weekly Meaningfully Active Job Seekers

Unique identified real production users with a meaningful event in `[asOf - 7 × 24 hours, asOf)`. This is an elapsed-time rolling window, independent of server timezone.

Meaningful events are explicit: job opened/saved, opportunity saved, application created/updated/status updated/action completed, marked applied, interview recorded, recommendation completed and follow-up completed. `search_completed` qualifies only with boolean `usableResult: true` supplied after usable-result validation. Merely submitting a search or opening an external search destination does not verify a usable job listing. Heartbeats, pageviews, session starts, return notices and registration never qualify.

Existing event aliases may describe the same action. North Star and retention count unique users, so aliases never multiply their counts. This is not an action-volume metric.

## D1, D3 and D7

For each registration timestamp `r`, Dn is a meaningful event in `[r + n × 24 hours, r + (n + 1) × 24 hours)`. A registration enters the denominator only after the entire interval has completed: `r + (n + 1) × 24 hours <= asOf`. This is exact elapsed-day retention, not calendar-day or “returned any time after n days” retention.

`rate = retained / eligible` is a fraction from 0 to 1. With zero eligible registrations, `rate` is `null`, not 0%. Missing registrations or event exports yield null denominator, numerator and rate. A verified mature cohort with no meaningful return produces a valid zero rate. Future and invalid timestamps are excluded.

This module cannot establish that an emitted event accurately represents its underlying interaction. Instrumentation verification, secure management access and a connected reporting data pipeline remain release work.
