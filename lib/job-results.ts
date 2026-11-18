import type { SearchProfile } from "./job-search";

export type JobSource = { name: string; url: string };
export type JobResult = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postedAt: string;
  schedule: string;
  remote: boolean | null;
  sources: JobSource[];
};
export type JobResultsResponse = {
  status: "ready" | "not-configured" | "sign-in-required" | "unavailable" | "limited";
  jobs: JobResult[];
  fetchedAt?: string;
};

type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue => v !== null && typeof v === "object" && !Array.isArray(v) ? v as RecordValue : {};
const text = (v: unknown, max = 300) => typeof v === "string" ? v.replace(/<[^>]*>/g, "").trim().slice(0, max) : "";

export function publicJobUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".localhost") || host.includes(":") || /^\d+(\.\d+){3}$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

export function jobSourceName(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
  if (/(^|\.)indeed\.[a-z.]+$/.test(host)) return "Indeed";
  return host;
}

// IDs are based on real posting identifiers, never on company/title alone.
export function resultSourceIdentity(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    const id = url.pathname.match(/^\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/)?.[1];
    if (id) return `linkedin:${id}`;
  }
  if (/(^|\.)indeed\.[a-z.]+$/.test(host) && url.searchParams.get("jk")) return `indeed:${url.searchParams.get("jk")}`;
  for (const name of [...url.searchParams.keys()]) if (/^(utm_|gclid$|fbclid$)/i.test(name)) url.searchParams.delete(name);
  url.searchParams.sort();
  return url.href;
}

export function normalizeJobResults(payload: unknown): JobResult[] {
  const rows = record(payload).jobs_results;
  if (!Array.isArray(rows)) return [];
  const jobs: JobResult[] = [];
  for (const input of rows.slice(0, 50)) {
    const row = record(input);
    const title = text(row.title), company = text(row.company_name);
    if (!title || !company) continue;
    const sources: JobSource[] = [];
    for (const option of (Array.isArray(row.apply_options) ? row.apply_options : []).slice(0, 15)) {
      const url = publicJobUrl(record(option).link);
      if (url && !sources.some(source => resultSourceIdentity(source.url) === resultSourceIdentity(url))) sources.push({ name: jobSourceName(url), url });
    }
    // Do not synthesize a LinkedIn/company link or substitute a search URL.
    if (!sources.length) continue;
    const detected = record(row.detected_extensions);
    jobs.push({
      id: text(row.job_id, 4096) ? `provider:${text(row.job_id, 4096)}` : resultSourceIdentity(sources[0].url),
      title, company, location: text(row.location), description: text(row.description, 20000),
      postedAt: text(detected.posted_at), schedule: text(detected.schedule_type),
      remote: typeof detected.work_from_home === "boolean" ? detected.work_from_home : null,
      sources,
    });
  }
  return deduplicateJobResults(jobs);
}

export function deduplicateJobResults(input: JobResult[]) {
  const groups: JobResult[] = [];
  for (const job of input) {
    const identities = new Set(job.sources.map(source => resultSourceIdentity(source.url)));
    const matches = groups.filter(group => group.id === job.id || group.sources.some(source => identities.has(resultSourceIdentity(source.url))));
    const merged = { ...job, sources: [...job.sources] };
    for (const match of matches) {
      merged.description = merged.description.length >= match.description.length ? merged.description : match.description;
      merged.sources.push(...match.sources);
      groups.splice(groups.indexOf(match), 1);
    }
    const seen = new Set<string>();
    merged.sources = merged.sources.filter(source => { const id = resultSourceIdentity(source.url); if (seen.has(id)) return false; seen.add(id); return true; });
    groups.push(merged);
  }
  return groups;
}

const normalize = (s: string) => s.toLocaleLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
function hasTerm(body: string, term: string) {
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(escaped) && new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(normalize(body));
}

export function jobMatchExplanation(job: JobResult, profile: SearchProfile) {
  const titles = [profile.role, ...(profile.alternativeRoles || "").split(",")].map(s => s.trim()).filter(Boolean);
  const title = titles.find(term => hasTerm(job.title, term));
  const body = `${job.title}\n${job.description}`;
  const skills = profile.skills.split(",").map(s => s.trim()).filter(Boolean);
  const matchedSkills = skills.filter(skill => hasTerm(body, skill));
  const missingRequiredSkills = profile.skillsMode === "required" ? skills.filter(skill => !matchedSkills.includes(skill)) : [];
  const excluded = profile.exclude.split(",").map(s => s.trim()).filter(term => term && hasTerm(body, term));
  const locationMatch = Boolean(profile.location && hasTerm(job.location, profile.location));
  return { title: title || "", matchedSkills, missingRequiredSkills, excluded, locationMatch,
    // Sorting aid only: not a probability of employment or a displayed fit percentage.
    order: (title ? 20 : 0) + matchedSkills.length * 2 + (locationMatch ? 4 : 0) - missingRequiredSkills.length * 3 - excluded.length * 10 };
}

export function postedAgeDays(value: string): number | null {
  const normalized = value.toLowerCase().trim();
  if (/^(today|just posted|just now)$/.test(normalized)) return 0;
  const match = normalized.match(/^(\d+)\s+(hour|day|week|month)s?\s+ago$/);
  if (!match) return null;
  const quantity = Number(match[1]);
  return quantity * ({ hour: 1 / 24, day: 1, week: 7, month: 30 }[match[2]] || 1);
}
