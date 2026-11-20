import type { PublicBoard } from "./free-job-sources";

// Candidate boards verified via public employer posting pages on 2026-11-20.
// This is NOT an activation allowlist. Confirm API responses and reuse terms first.
// No live requests, secrets, user data, or paid services.
export const FREE_JOB_BOARD_CANDIDATES: readonly PublicBoard[] = [
  { provider: "lever", token: "walkme", company: "WalkMe" },
  { provider: "lever", token: "lendbuzz", company: "Lendbuzz" },
  { provider: "lever", token: "Zadara", company: "Zadara" },
  { provider: "lever", token: "weloglobal", company: "Welo Global" },
  { provider: "lever", token: "airslate", company: "airSlate" },
];
