import { notFound } from "next/navigation";
import { createCachedBoardFetcher } from "@/lib/free-job-board-cache";
import { dedupePublicJobs } from "@/lib/free-job-sources";
import type { PublicBoard } from "@/lib/free-job-sources";

export const dynamic = "force-dynamic";
const boards: readonly PublicBoard[] = [
  { provider: "greenhouse", token: "greenhouse", company: "Greenhouse" },
  { provider: "lever", token: "walkme", company: "WalkMe" },
  { provider: "lever", token: "lendbuzz", company: "Lendbuzz" },
  { provider: "lever", token: "Zadara", company: "Zadara" },
  { provider: "lever", token: "airslate", company: "airSlate" },
];
const getJobs = createCachedBoardFetcher();

export default async function AtsPreview({ searchParams }: { searchParams: Promise<{ q?: string; location?: string; age?: string }> }) {
  // Never expose the pilot in production or permit user-controlled ATS endpoints.
  if (process.env.VERCEL_ENV !== "preview") notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const location = typeof params.location === "string" ? params.location.trim().slice(0, 80) : "";
  const age = params.age === "all" ? "all" : params.age === "90" ? "90" : "180";
  const cutoff = Date.now() - Number(age === "all" ? 0 : age) * 86_400_000;
  const results = await Promise.all(boards.map(board => getJobs(board)));
  const allJobs = dedupePublicJobs(results.flatMap(result => result.jobs));
  const availableSources = results.filter(result => result.status === "ok").length;
  const jobs = allJobs.filter(job => {
    if (q && ![job.title, job.company, job.location].some(v => v.toLocaleLowerCase().includes(q.toLocaleLowerCase()))) return false;
    if (location && !job.location.toLocaleLowerCase().includes(location.toLocaleLowerCase())) return false;
    if (age !== "all") {
      const published = job.postedAt ? Date.parse(job.postedAt) : NaN;
      if (!Number.isFinite(published) || published < cutoff || published > Date.now() + 86_400_000) return false;
    }
    return true;
  }).sort((a, b) => {
    // A title match is more relevant than a company or location-only match.
    const relevance = (job: typeof a) => !q ? 0 : job.title.toLocaleLowerCase().includes(q.toLocaleLowerCase()) ? 2 : job.company.toLocaleLowerCase().includes(q.toLocaleLowerCase()) ? 1 : 0;
    return relevance(b) - relevance(a) || (Date.parse(b.postedAt ?? "") || 0) - (Date.parse(a.postedAt ?? "") || 0);
  });
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-900">
      <p className="text-sm font-semibold text-indigo-700">CARVIO · Preview only</p>
      <h1 className="mt-2 text-3xl font-bold">Live employer jobs — test pilot</h1>
      <p className="mt-3 text-sm text-slate-600">Read-only multi-employer search experiment using fixed official ATS endpoints. Not the full CARVIO search engine. Coverage and employer posting rights require further review. Links open at the employer.</p>
      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Try: engineer, London, sales" aria-label="Filter jobs" maxLength={80} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3" />
        <button type="submit" className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white">Filter</button>
        <input name="location" defaultValue={location} placeholder="Location (e.g. London)" aria-label="Location contains" maxLength={80} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3" />
        <select name="age" defaultValue={age} aria-label="Maximum posting age" className="rounded-lg border border-slate-300 bg-white px-2 py-3"><option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="all">All dates</option></select>
      </form>
      <p className="mt-3 text-xs text-slate-500">Pilot only: sources are not licensed for production reuse yet; do not treat coverage as comprehensive. Matching prioritizes job titles and then publication recency. Employer links are not independently verified. </p>
      <p className="mt-3 text-xs text-slate-500">By default, postings older than 180 days or missing a valid publication date are hidden. Location is an exact text filter, not a country or remote-work classifier. The employer may change or close postings independently.</p>
      <p className="mt-5 text-sm text-slate-600" role="status">{availableSources ? `${jobs.length} matching jobs from ${allJobs.length} unique fetched postings · ${availableSources}/${boards.length} sources responding` : "Sources temporarily unavailable — no live results. Please retry later."}</p>
      <div className="mt-5 space-y-3">
        {jobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{job.company} · {job.location || "Location not supplied"}</p>
          <p className="mt-2 text-xs text-slate-500">{job.postedAt ? `Published: ${job.postedAt.slice(0,10)}` : "Publication date unavailable"}</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline">View original job / apply</a>
        </article>)}
      </div>
      {availableSources > 0 && jobs.length === 0 && <p className="mt-5 text-sm text-slate-600">No matches on this employer board. Try another keyword.</p>}
    </main>
  );
}
