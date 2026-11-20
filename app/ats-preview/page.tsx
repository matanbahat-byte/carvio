import { notFound } from "next/navigation";
import { createCachedBoardFetcher } from "@/lib/free-job-board-cache";
import { dedupePublicJobs } from "@/lib/free-job-sources";
import { searchPreviewJobs, titleMatches } from "@/lib/free-job-preview-search";
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
export default async function AtsPreview({ searchParams }: { searchParams: Promise<{ q?: string; location?: string; country?: string; city?: string; age?: string }> }) {
  // Never expose the pilot in production or permit user-controlled ATS endpoints.
  if (process.env.VERCEL_ENV !== "preview") notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const location = typeof params.location === "string" ? params.location.trim().slice(0, 80) : "";
  const country = typeof params.country === "string" ? params.country.trim().slice(0, 80) : "";
  const city = typeof params.city === "string" ? params.city.trim().slice(0, 80) : "";
  const age = params.age === "all" ? "all" : params.age === "90" ? "90" : "180";
  const results = await Promise.all(boards.map(board => getJobs(board)));
  const allJobs = dedupePublicJobs(results.flatMap(result => result.jobs));
  const availableSources = results.filter(result => result.status === "ok").length;
  const jobs = searchPreviewJobs(allJobs, { query: q, location, country, city, age });
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-900">
      <p className="text-sm font-semibold text-indigo-700">CARVIO · Preview only</p>
      <h1 className="mt-2 text-3xl font-bold">Live employer jobs — test pilot</h1>
      <p className="mt-3 text-sm text-slate-600">Read-only multi-employer search experiment using fixed official ATS endpoints. Not the full CARVIO search engine. Coverage and employer posting rights require further review. Links open at the employer.</p>
      <form method="get" className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">Job title
          <input name="q" defaultValue={q} placeholder="e.g. Software Engineer" maxLength={80} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Country
          <input name="country" defaultValue={country || (location.toLowerCase()==="israel" ? location : "")} placeholder="e.g. Israel" maxLength={80} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">City (optional)
          <input name="city" defaultValue={city || (location && location.toLowerCase()!=="israel" ? location : "")} placeholder="e.g. Tel Aviv" maxLength={80} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" />
        </label>
        <input type="hidden" name="age" value="180" />
        <button type="submit" className="w-full rounded-lg bg-indigo-700 px-5 py-4 text-base font-semibold text-white">Search jobs</button>
      </form>
      {(q || country || city || location) && <p className="mt-4 text-sm font-medium text-slate-700" role="status">Searching: {[q,country || location,city].filter(Boolean).join(" · ")}</p>}
      <p className="mt-3 text-xs text-slate-500">Pilot only: sources are not licensed for production reuse yet; do not treat coverage as comprehensive. Matching prioritizes job titles and then publication recency; a few exact role searches include related title aliases. Employer links are not independently verified. </p>
      <p className="mt-3 text-xs text-slate-500">By default, postings older than 180 days or missing a valid publication date are hidden. Israel includes common Israeli city-name aliases; other locations use literal text matching. Remote-work eligibility is not inferred. The employer may change or close postings independently.</p>
      <p className="mt-5 text-sm text-slate-600" role="status">{availableSources ? `${jobs.length} matching jobs from ${allJobs.length} unique fetched postings · ${availableSources}/${boards.length} sources responding` : "Sources temporarily unavailable — no live results. Please retry later."}</p>
      {availableSources < boards.length && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Partial coverage: {boards.length - availableSources} employer source(s) did not respond. Missing jobs are possible; retry later.</p>}
      <div className="mt-5 space-y-3">
        {jobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{job.company} · {job.location || "Location not supplied"}</p>
          <p className="mt-2 text-xs font-medium text-indigo-700">{q ? titleMatches(job.title, q) ? job.title.toLocaleLowerCase().includes(q.toLocaleLowerCase()) ? "Match: job title" : "Match: related job title" : "Match: employer or location" : "Sorted by newest publication date"}</p>
          <p className="mt-2 text-xs text-slate-500">{job.postedAt ? `Published: ${job.postedAt.slice(0,10)}` : "Publication date unavailable"}</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline">View original job / apply</a>
        </article>)}
      </div>
      {availableSources > 0 && jobs.length === 0 && <p className="mt-5 text-sm text-slate-600">No matches across the currently responding employer boards. Try a broader keyword, another location or All dates. This does not mean no such jobs exist elsewhere.</p>}
    </main>
  );
}
