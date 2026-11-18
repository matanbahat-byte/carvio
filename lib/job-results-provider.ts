import type { SearchProfile } from "./job-search";
import { normalizeJobResults, type JobResult } from "./job-results.ts";

export function providerSearchQuery(profile: SearchProfile) {
  const quote = (s: string) => `"${s.replace(/["“”]/g, "").trim()}"`;
  const titles = [profile.role, ...(profile.alternativeRoles || "").split(",")].map(s => s.trim()).filter(Boolean).slice(0, 5);
  const required = profile.skillsMode === "required" ? profile.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const exclusions = profile.exclude.split(",").map(s => s.trim().replace(/^-+/, "")).filter(Boolean);
  return [`(${titles.map(quote).join(" OR ")})`, ...required.map(quote), ...exclusions.map(s => `-${quote(s)}`), profile.workModel].filter(Boolean).join(" ");
}

export async function fetchProviderJobs(profile: SearchProfile, language: "he" | "en", apiKey: string, fetcher: typeof fetch = fetch): Promise<JobResult[]> {
  const params = new URLSearchParams({ engine: "google_jobs", q: providerSearchQuery(profile), location: [profile.location, profile.country].filter(Boolean).join(", "), hl: language, api_key: apiKey });
  // Fixed destination; no request is made to URLs supplied by users or providers.
  const response = await fetcher(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(12000), redirect: "error", cache: "no-store" });
  if (!response.ok) throw new Error("Provider unavailable");
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error("Provider response too large");
  const payload = JSON.parse(body);
  if (payload?.error || !Array.isArray(payload?.jobs_results)) {
    throw new Error("Provider unavailable");
  }
  return normalizeJobResults(payload);
}
