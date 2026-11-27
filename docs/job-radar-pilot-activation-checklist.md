# Controlled pilot activation checklist

Status: OFF. Two intended accounts verified in production; no participants enrolled in isolated development. Do not copy auth records or personal tokens.

## Release gates

- [ ] Reconcile branch with current main and run build, unit, browser and database tests.
- [ ] Review migrations on isolated backend; release consent/preferences UI with sending OFF.
- [ ] Each intended participant signs in and explicitly opts in with their own role, location and frequency.
- [ ] Operator enrolls exactly the two verified consenting account IDs; capture aggregate seven-day baseline.
- [ ] Approve public ATS boards matching actual preferences; verify fresh individual job URLs and deduplication.
- [ ] CARVIO account owner authorizes dedicated Google OAuth client with Gmail send scope. Store runtime credentials only in approved secret store, never Git or chat. Verify actual sender is carvio.team@gmail.com; reject all other identities. Check token refresh and Google consent configuration.
- [ ] Run authenticated dry-run with intended backend and runtime credentials; no send calls. Review both previews and final gate results.
- [ ] Implement and review controlled live runner separately from dry-run CLI; verify schedule, daily cap of two, unknown outcome handling, opt-out and emergency stop.
- [ ] Enable only after all gates pass; verify first accepted messages and participant-confirmed inbox receipt. Stop on any safety failure.

No paid vendor, no broad enrollment, no inferred consent. Production registration alone is not consent. Never mark a gate complete without evidence. This checklist does not activate any job or send any email.
