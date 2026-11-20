import { fetchPublicBoardJobs } from "./free-job-board-fetch.ts";
import { publicBoardEndpoint, type PublicBoard, type PublicJob } from "./free-job-sources.ts";

// In-process, bounded cache for an inactive server-only pilot. Serverless instances do not share state.
// Callers must independently enforce an approved board allowlist and usage rights.
type Result = { jobs: PublicJob[]; status: "ok" | "unavailable" | "invalid" };
type CacheEntry = { expires: number; result: Result };
export function createCachedPublicBoardFetcher(options: {
  fetcher?: typeof fetch;
  now?: () => number;
  ttlMs?: number;
  maxEntries?: number;
} = {}) {
  const entries = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<Result>>();
  const now = options.now ?? Date.now;
  const ttl = Math.min(300_000, Math.max(1_000, options.ttlMs ?? 60_000));
  const limit = Math.min(50, Math.max(1, options.maxEntries ?? 20));
  return async (board: PublicBoard): Promise<Result> => {
    let key: string;
    try { key = publicBoardEndpoint(board) + "|" + board.company; }
    catch { return { jobs: [], status: "invalid" }; }
    const hit = entries.get(key);
    if (hit && hit.expires > now()) return hit.result;
    if (hit) entries.delete(key);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const pending = fetchPublicBoardJobs(board, { fetcher: options.fetcher })
      .then(result => {
        // Never cache errors: callers can retry when the upstream recovers.
        if (result.status === "ok") {
          entries.delete(key);
          entries.set(key, { result, expires: now() + ttl });
          while (entries.size > limit) entries.delete(entries.keys().next().value!);
        }
        return result;
      }).finally(() => { inFlight.delete(key); });
    inFlight.set(key, pending);
    return pending;
  };
}
