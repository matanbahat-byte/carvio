import { normalizePublicBoardJobs, publicBoardEndpoint, type PublicBoard, type PublicJob } from "./free-job-sources";

// Inactive server-side pilot utility. Not imported by a route or UI.
// The caller must enforce an approved board allowlist, rate limits and usage rights.
export async function fetchPublicBoardJobs(
  board: PublicBoard,
  options: { fetcher?: typeof fetch; timeoutMs?: number; maxResults?: number } = {},
): Promise<{ jobs: PublicJob[]; status: "ok" | "unavailable" | "invalid" }> {
  let endpoint: string;
  try { endpoint = publicBoardEndpoint(board); }
  catch { return { jobs: [], status: "invalid" }; }
  const timeoutMs = Math.min(5000, Math.max(100, options.timeoutMs ?? 2500));
  const maxResults = Math.min(100, Math.max(1, options.maxResults ?? 50));
  try {
    const response = await (options.fetcher ?? fetch)(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("json"))
      return { jobs: [], status: "unavailable" };
    const body = await response.text();
    if (body.length > 2_000_000) return { jobs: [], status: "unavailable" };
    return { jobs: normalizePublicBoardJobs(board, JSON.parse(body)).slice(0, maxResults), status: "ok" };
  } catch { return { jobs: [], status: "unavailable" }; }
}
