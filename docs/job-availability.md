# Listing availability checks (local, 2026-11-06)

The link capture review now checks public Greenhouse and Lever (including EU) posting URLs. This is a source-publication check, not a guarantee that applications are being reviewed or that the job fits the user. It does not filter Google's external results.

- Matching structured job response: still published, with check time.
- Missing individual posting plus a successfully retrieved, valid public board which omits its ID: no longer published. This may mean closed or removed; saving remains available for historical tracking.
- Unsupported source, redirect, timeout, blocking, rate limit, malformed response or invalid board: unknown. No automatic closure inference or deletion.

Requests are constructed from validated board/job identifiers onto fixed public ATS API hosts. Arbitrary supplied destinations, credentials, ports and redirect targets are not fetched. Requests have a shared seven-second timeout, no cache, and a two-megabyte response limit. No supplied URL or description is explicitly logged by application code. Only the URL is sent to the local availability endpoint, not the pasted job description or profile. Checks are transient in the capture review, not persisted as enduring job status. No dependencies or credentials were added.

Official references: https://docs.greenhouse.io/job-board and https://github.com/lever/postings-api

Validation: 69 automated tests passed; production build including TypeScript passed. Live local capture of `https://job-boards.greenhouse.io/monticelloam/jobs/4418651009` returned “Still published at the source”. An Apple careers link correctly returned unsupported/unknown. Neither listing was saved nor applied to. Removed/blocked/malformed/oversized cases were tested with deterministic response fixtures, not represented as live closure checks. No production deployment performed.
