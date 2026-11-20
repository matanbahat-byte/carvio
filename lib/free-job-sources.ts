// Opt-in foundation for free, public employer job boards. No live requests or credentials.
// Do not enable in the UI until board permission, coverage and runtime limits are verified.
export type PublicBoard = { provider: "greenhouse" | "lever"; token: string; company: string };
export type PublicJob = { id: string; title: string; company: string; location: string; url: string; provider: PublicBoard["provider"]; postedAt: string | null };

function httpsUrl(value: unknown, host: string) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (url.hostname !== host && !url.hostname.endsWith("." + host))) return null;
    return url.href;
  } catch { return null; }
}
function postingDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function validBoard(board: PublicBoard) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(board.token) && Boolean(text(board.company));
}
export function publicBoardEndpoint(board: PublicBoard) {
  if (!validBoard(board)) throw new Error("Invalid board");
  if (board.provider === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs`;
  if (board.provider === "lever") return `https://api.lever.co/v0/postings/${encodeURIComponent(board.token)}?mode=json`;
  throw new Error("Unsupported provider");
}
export function normalizePublicBoardJobs(board: PublicBoard, payload: unknown): PublicJob[] {
  if (!validBoard(board)) return [];
  const records = board.provider === "greenhouse"
    ? (payload && typeof payload === "object" && "jobs" in payload ? (payload as {jobs?:unknown}).jobs : null)
    : payload;
  if (!Array.isArray(records)) return [];
  const output: PublicJob[] = [];
  const seen = new Set<string>();
  for (const item of records.slice(0, 500)) {
    if (!item || typeof item !== "object") continue;
    const job = item as Record<string, unknown>;
    const id = String(job.id ?? "").trim();
    const title = text(job.title ?? job.text);
    const loc = job.location && typeof job.location === "object" ? (job.location as Record<string, unknown>).name : "";
    const categories = job.categories && typeof job.categories === "object" ? job.categories as Record<string, unknown> : null;
    const location = text(board.provider === "lever" ? categories?.location : loc);
    const url = board.provider === "greenhouse"
      ? httpsUrl(job.absolute_url, "greenhouse.io")
      : httpsUrl(job.hostedUrl, "lever.co");
    if (!id || !title || !url || seen.has(url)) continue;
    seen.add(url);
    // updated_at is not a posting date; never mislabel it as one.
    const date = board.provider === "greenhouse" ? job.first_published : job.createdAt;
    output.push({id:`${board.provider}:${board.token}:${id}`,title,company:board.company,location,url,provider:board.provider,postedAt:postingDate(date)});
  }
  return output;
}
export function dedupePublicJobs(jobs: PublicJob[]): PublicJob[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = job.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
