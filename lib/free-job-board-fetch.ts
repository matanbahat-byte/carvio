import { normalizePublicBoardJobs, publicBoardEndpoint, type PublicBoard, type PublicJob } from "./free-job-sources.ts";

// Inactive server-side pilot utility. Not imported by a route or UI.
// The caller must enforce an approved board allowlist, rate limits and usage rights.
const MAX_RESPONSE_BYTES = 2_000_000;

async function readBoundedJson(response: Response): Promise<unknown> {
  const header = response.headers.get("content-length");
  if (header && Number.isFinite(Number(header)) && Number(header) > MAX_RESPONSE_BYTES) throw new Error("Response too large");
  if (!response.body) throw new Error("Missing response body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error("Response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
}

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
    return { jobs: normalizePublicBoardJobs(board, await readBoundedJson(response)).slice(0, maxResults), status: "ok" };
  } catch { return { jobs: [], status: "unavailable" }; }
}
