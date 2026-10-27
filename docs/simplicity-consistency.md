# Simplicity and consistency — local iteration

Branch: `codex/simplicity-consistency`. No production deployment.

## Scope

- Direct Settings and backup shortcut in desktop navigation and mobile More menu.
- Contextual settings page heading; consistent Settings terminology.
- Hebrew/English backup modal, export/import feedback, deletion confirmation and notification dismissal.
- Explicit local-file backup language and warning about replacing existing records; restore requires confirmation before state changes.
- Hiring stage / next action explanation. Optional progress signal is collapsed by default without changing saved data.
- Quick-add follow-up no longer creates the legacy Follow-up due hiring stage.

## Verification

- Six automated requirements/schedule regression tests passed; production build and TypeScript passed.
- Desktop Hebrew: settings shortcut, backup labels, cancel restore, and add application flow.
- Isolated demo remained at seven active applications after cancelling restore; a new fictional application increased it to eight and remained after refresh.
- Mobile 390×844: More → Settings opens directly and closes the More menu; backup modal is readable and usable.
- English settings and backup labels verified in browser; viewport restored afterward.
- No personal records, cloud data or authentication configuration changed. Email verification and cloud restore remain unverified.

Evidence: `/tmp/carvio-simplicity-backup-he.jpg`, `/tmp/carvio-simplicity-mobile-he.jpg`.
