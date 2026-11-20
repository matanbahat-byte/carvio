import { notFound } from "next/navigation";
import { fetchPublicBoardJobs } from "@/lib/free-job-board-fetch";
import type { PublicBoard } from "@/lib/free-job-sources";

export const dynamic = "force-dynamic";
// Fixed source validation only. Not an ingestion or public search endpoint.
const boards: readonly PublicBoard[] = [
  { provider: "lever", token: "walkme", company: "WalkMe" },
  { provider: "lever", token: "lendbuzz", company: "Lendbuzz" },
  { provider: "lever", token: "Zadara", company: "Zadara" },
  { provider: "lever", token: "weloglobal", company: "Welo Global" },
  { provider: "lever", token: "airslate", company: "airSlate" },
];
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") notFound();
  const checks = [];
  for (const board of boards) {
    const result = await fetchPublicBoardJobs(board, { timeoutMs: 2500, maxResults: 100 });
    checks.push({ company: board.company, provider: board.provider, status: result.status, count: result.jobs.length,
      israel: result.jobs.filter(job => /israel|tel aviv|herzliya|haifa|jerusalem|petah tikva|ramat gan/i.test(job.location)).length,
      europe: result.jobs.filter(job => /europe|london|united kingdom|ireland|germany|netherlands|spain|portugal|france|poland|berlin|amsterdam|dublin|paris|warsaw|madrid|lisbon/i.test(job.location)).length });
  }
  return Response.json({ note: "Preview-only source diagnostics. Counts do not establish posting reuse permission or link validity.", checks }, { headers: { "Cache-Control": "private, max-age=0, s-maxage=300" } });
}
