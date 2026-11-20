import { notFound } from "next/navigation";
import { fetchPublicBoardJobs } from "@/lib/free-job-board-fetch";
import type { PublicBoard } from "@/lib/free-job-sources";

export const dynamic = "force-dynamic";
// Fixed source validation only. Not an ingestion or public search endpoint.
const boards: readonly PublicBoard[] = [
  { provider: "greenhouse", token: "greenhouse", company: "Greenhouse" },
  { provider: "lever", token: "walkme", company: "WalkMe" },
  { provider: "lever", token: "lendbuzz", company: "Lendbuzz" },
  { provider: "lever", token: "Zadara", company: "Zadara" },
  { provider: "lever", token: "airslate", company: "airSlate" },
];
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") notFound();
  // Independent board checks run concurrently to keep diagnostics responsive.
  const checks = await Promise.all(boards.map(async board => {
    const result = await fetchPublicBoardJobs(board, { timeoutMs: 2500, maxResults: 100 });
    const now = Date.now();
    const recent = result.jobs.filter(job => { const ts = job.postedAt ? Date.parse(job.postedAt) : NaN; return Number.isFinite(ts) && ts <= now + 86_400_000 && ts >= now - 180 * 86_400_000; });
    return { company: board.company, provider: board.provider, status: result.status, count: result.jobs.length, recent180Days: recent.length, missingOrOldDates: result.jobs.length - recent.length,
      israel: recent.filter(job => /israel|tel aviv|herzliya|haifa|jerusalem|petah tikva|ramat gan/i.test(job.location)).length,
      europe: recent.filter(job => /europe|london|united kingdom|ireland|germany|netherlands|spain|portugal|france|poland|berlin|amsterdam|dublin|paris|warsaw|madrid|lisbon/i.test(job.location)).length };
  }));
  return Response.json({ note: "Preview-only source diagnostics. Israel/Europe counts are on recent postings only and use location-text heuristics. Counts do not establish posting reuse permission or link validity.", checks }, { headers: { "Cache-Control": "private, max-age=0, s-maxage=300" } });
}
