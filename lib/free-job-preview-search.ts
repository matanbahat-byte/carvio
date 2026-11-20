// Deterministic preview relevance rules; never infer remote-work eligibility.
import type { PublicJob } from "./free-job-sources.ts";
const aliases: Record<string, string[]> = {
  "hr business partner": ["hrbp", "people partner", "human resources business partner", "people business partner"],
  "supply chain manager": ["supply chain lead", "supply chain director", "head of supply chain", "supply chain planning manager"],
  "software engineer": ["software developer", "backend engineer", "frontend engineer", "full stack engineer", "full-stack engineer"],
};
const israelPlaces = /\\b(israel|tel[ -]?aviv|herzliya|haifa|jerusalem|petah[ -]?tikva|ramat[ -]?gan|raanana|rishon[ -]?lezion|netanya|beer[ -]?sheva|bnei[ -]?brak|hod[ -]?hasharon|kfar[ -]?saba|yokneam|rehovot)\\b/i;
export function titleMatches(title: string, query: string): boolean {
  const needle = query.toLocaleLowerCase().trim();
  if (!needle) return true;
  const haystack = title.toLocaleLowerCase();
  return haystack.includes(needle) || (aliases[needle] ?? []).some(alias => haystack.includes(alias));
}
export function locationMatches(actual: string, requested: string): boolean {
  const needle = requested.toLocaleLowerCase().trim();
  if (!needle) return true;
  return needle === "israel" ? israelPlaces.test(actual) : actual.toLocaleLowerCase().includes(needle);
}
export function searchPreviewJobs(jobs: PublicJob[], options: {query?:string;location?:string;age?: "90"|"180"|"all";now?:number}): PublicJob[] {
  const query=(options.query ?? "").trim().slice(0,80);
  const location=(options.location ?? "").trim().slice(0,80);
  const age=options.age ?? "180";
  const now=options.now ?? Date.now();
  const cutoff=now - Number(age === "all" ? 0 : age)*86_400_000;
  return jobs.filter(job=>{
    if (query && !titleMatches(job.title,query) && ![job.company,job.location].some(v=>v.toLocaleLowerCase().includes(query.toLocaleLowerCase()))) return false;
    if (!locationMatches(job.location,location)) return false;
    if (age !== "all") {
      const published=job.postedAt ? Date.parse(job.postedAt) : NaN;
      if (!Number.isFinite(published) || published < cutoff || published > now+86_400_000) return false;
    }
    return true;
  }).sort((a,b)=>{
    const relevance=(job:PublicJob)=>!query?0:titleMatches(job.title,query)?2:job.company.toLocaleLowerCase().includes(query.toLocaleLowerCase())?1:0;
    return relevance(b)-relevance(a) || (Date.parse(b.postedAt ?? "") || 0)-(Date.parse(a.postedAt ?? "") || 0);
  });
}
