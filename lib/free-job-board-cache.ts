import { fetchPublicBoardJobs } from "./free-job-board-fetch.ts";
import { publicBoardEndpoint, type PublicBoard, type PublicJob } from "./free-job-sources.ts";

type Result = { jobs: PublicJob[]; status: "ok" | "unavailable" | "invalid" };
type Entry = { expiresAt: number; result: Result };

// Process-local pilot cache. Serverless instances do not share state.
// Caller must enforce an approved board allowlist and usage rights before calling.
export function createCachedBoardFetcher(options: {
  fetcher?: typeof fetch;
  now?: () => number;
  ttlMs?: number;
  maxBoards?: number;
} = {}) {
  const cache = new Map<string, Entry>();
  const copyResult = (result: Result): Result => ({ ...result, jobs: result.jobs.map(job => ({ ...job })) });
  const pending = new Map<string, Promise<Result>>();
  const now = options.now ?? Date.now;
  const ttlMs = Math.min(15 * 60_000, Math.max(30_000, options.ttlMs ?? 5 * 60_000));
  const maxBoards = Math.min(50, Math.max(1, options.maxBoards ?? 10));
  return async (board: PublicBoard): Promise<Result> => {
    let key: string;
    try { key = publicBoardEndpoint(board) + "|" + board.company; }
    catch { return { jobs: [], status: "invalid" }; }
    const entry = cache.get(key);
    if (entry && entry.expiresAt > now()) return copyResult(entry.result);
    const existing = pending.get(key);
    if (existing) return existing.then(copyResult);
    const work = (async () => {
      const result = await fetchPublicBoardJobs(board, { fetcher: options.fetcher });
      if (result.status === "ok") {
        cache.delete(key);
        cache.set(key, { expiresAt: now() + ttlMs, result: copyResult(result) });
        while (cache.size > maxBoards) cache.delete(cache.keys().next().value!);
      }
      return result;
    })();
    pending.set(key, work);
    try {
      const result = await work;
      return copyResult(result);
    } finally { pending.delete(key); }
  };
}
