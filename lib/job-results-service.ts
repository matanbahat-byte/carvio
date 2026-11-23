import { emptySearchProfile, sanitizeSearchProfile, type SearchProfile } from "./job-search.ts";
import { fetchProviderJobs, providerSearchQuery } from "./job-results-provider.ts";
import type { JobResultsResponse } from "./job-results";

export function parseJobSearchInput(value: unknown): { profile: SearchProfile; language: "he" | "en" } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.profile || typeof body.profile !== "object" || Array.isArray(body.profile)) return null;
  const input = body.profile as Record<string, unknown>;
  const profile = { ...emptySearchProfile };
  const keys = ["role", "alternativeRoles", "filterRole", "location", "country", "radius", "skills", "skillsMode", "seniority", "workModel", "employmentType", "datePosted", "industry", "exclude"] as const;
  for (const key of keys) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "string" || input[key].length > 400 || /[\x00-\x1f]/.test(input[key])) return null;
      Object.assign(profile, { [key]: input[key] });
    }
  }
  if (!profile.role.trim() || !profile.country.trim() || profile.country === "Other" || profile.role.length > 120 || profile.location.length > 120 || profile.country.length > 80) return null;
  return { profile: sanitizeSearchProfile(profile), language: body.language === "he" ? "he" : "en" };
}

type CacheEntry = { expires: number; response: JobResultsResponse };
export function createJobSearchService({ fetcher = fetch, now = Date.now } = {}) {
  const cache = new Map<string, CacheEntry>();
  const pending = new Map<string, Promise<JobResultsResponse>>();
  const limits = new Map<string, { start: number; count: number }>();
  const hourly = { start: 0, count: 0 };
  return async (userId: string, profile: SearchProfile, language: "he" | "en", apiKey: string): Promise<JobResultsResponse> => {
    const time = now();
    for (const [id, value] of limits) if (time - value.start >= 60_000) limits.delete(id);
    const user = limits.get(userId) || { start: time, count: 0 };
    if (user.count >= 6) return { status: "limited", jobs: [] };
    user.count++;
    limits.set(userId, user);
    const key = JSON.stringify([providerSearchQuery(profile), profile.location, profile.country, language]);
    const cached = cache.get(key);
    if (cached && cached.expires > time) return cached.response;
    if (pending.has(key)) return pending.get(key)!;
    if (time - hourly.start >= 3_600_000) { hourly.start = time; hourly.count = 0; }
    if (hourly.count >= 60) return { status: "limited", jobs: [] };
    hourly.count++;
    const task = (async (): Promise<JobResultsResponse> => {
      try {
        const jobs = await fetchProviderJobs(profile, language, apiKey, fetcher);
        const response: JobResultsResponse = { status: "ready", jobs, fetchedAt: new Date(now()).toISOString() };
        for (const [id, entry] of cache) if (entry.expires <= time) cache.delete(id);
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(key, { response, expires: now() + 600_000 });
        return response;
      } catch { return { status: "unavailable", jobs: [] }; }
      finally { pending.delete(key); }
    })();
    pending.set(key, task);
    return task;
  };
}
