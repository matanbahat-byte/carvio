import { notFound } from "next/navigation";
import { createCachedBoardFetcher } from "@/lib/free-job-board-cache";
import type { PublicBoard } from "@/lib/free-job-sources";

export const dynamic = "force-dynamic";
const board: PublicBoard = { provider: "greenhouse", token: "greenhouse", company: "Greenhouse" };
const getJobs = createCachedBoardFetcher();

export default async function AtsPreview({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Never expose the pilot in production or permit user-controlled ATS endpoints.
  if (process.env.VERCEL_ENV !== "preview") notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const result = await getJobs(board);
  const jobs = result.jobs.filter(job => !q || [job.title, job.company, job.location].some(v => v.toLocaleLowerCase().includes(q.toLocaleLowerCase())));
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-900">
      <p className="text-sm font-semibold text-indigo-700">CARVIO · Preview only</p>
      <h1 className="mt-2 text-3xl font-bold">Live employer jobs — test pilot</h1>
      <p className="mt-3 text-sm text-slate-600">Read-only experiment with one fixed Greenhouse employer board. This is not the full CARVIO search engine; Israel coverage is not guaranteed. Links open at the employer.</p>
      <form method="get" className="mt-6 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Try: engineer, London, sales" aria-label="Filter jobs" maxLength={80} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3" />
        <button type="submit" className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white">Filter</button>
      </form>
      <p className="mt-5 text-sm text-slate-600" role="status">{result.status === "ok" ? `${jobs.length} matching jobs from ${result.jobs.length} fetched postings` : "Source temporarily unavailable — no live results. Please retry later."}</p>
      <div className="mt-5 space-y-3">
        {jobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{job.company} · {job.location || "Location not supplied"}</p>
          <p className="mt-2 text-xs text-slate-500">{job.postedAt ? `Published: ${job.postedAt.slice(0,10)}` : "Publication date unavailable"}</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline">View original job / apply</a>
        </article>)}
      </div>
      {result.status === "ok" && jobs.length === 0 && <p className="mt-5 text-sm text-slate-600">No matches on this employer board. Try another keyword.</p>}
    </main>
  );
}
