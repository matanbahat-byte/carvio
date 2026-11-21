// Opt-in foundation for free, public employer job boards. No live requests or credentials.
// Do not enable in the UI until board permission, coverage and runtime limits are verified.
export type PublicBoard = { provider: "greenhouse" | "lever"; token: string; company: string; region?: "global" | "eu" };
export type PublicJob = { id: string; title: string; company: string; location: string; url: string; provider: PublicBoard["provider"]; postedAt: string | null };

function httpsUrl(value: unknown, host: string) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (url.hostname !== host && !url.hostname.endsWith("." + host))) return null;
    return url.href;
  } catch { return null; }
}
function officialGreenhousePostingUrl(value: unknown, board: PublicBoard, id: string) {
  const safe = httpsUrl(value, "greenhouse.io");
  if (!safe) return null;
  const url = new URL(safe);
  const segments = url.pathname.split("/").filter(Boolean).map(segment => {
    try { return decodeURIComponent(segment).toLowerCase(); } catch { return ""; }
  });
  const token = board.token.toLowerCase();
  const jobIndex = segments.lastIndexOf("jobs");
  // Do not associate another employer's posting with this board.
  if (jobIndex < 1 || segments[jobIndex - 1] !== token || segments[jobIndex + 1] !== id || jobIndex + 2 !== segments.length) return null;
  return safe;
}
function safeEmployerApplicationUrl(value: string, id: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    // Employer-hosted links are displayed to users, never fetched by CARVIO.
    // Still reject local-network and loopback destinations.
    if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.startsWith("[") || host.endsWith(".local")) return null;
    if (/^(?:0\\.|10\\.|127\\.|169\\.254\\.|192\\.168\\.|172\\.(?:1[6-9]|2[0-9]|3[01])\\.)/.test(host)) return null;
    // Greenhouse embeds the posting identifier in employer-hosted URLs as gh_jid.
    const jobIds = url.searchParams.getAll("gh_jid");
    return jobIds.length === 1 && jobIds[0] === id ? url.href : null;
  } catch { return null; }
}
function leverPostingUrl(value: unknown, board: PublicBoard) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const expectedHost = board.region === "eu" ? "jobs.eu.lever.co" : "jobs.lever.co";
    if (url.protocol !== "https:" || url.hostname !== expectedHost || url.username || url.password || url.port) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2 || segments[0].toLowerCase() !== board.token.toLowerCase()) return null;
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
  return (board.provider === "greenhouse" || board.provider === "lever") && /^[a-zA-Z0-9_-]{1,100}$/.test(board.token) && Boolean(text(board.company));
}
export function publicBoardEndpoint(board: PublicBoard) {
  if (!validBoard(board) || (board.region && !["global", "eu"].includes(board.region))) throw new Error("Invalid board");
  if (board.provider === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs`;
  if (board.provider === "lever") return `https://${board.region === "eu" ? "api.eu.lever.co" : "api.lever.co"}/v0/postings/${encodeURIComponent(board.token)}?mode=json`;
  throw new Error("Unsupported provider");
}
export function normalizePublicBoardJobs(board: PublicBoard, payload: unknown): PublicJob[] {
  if (!validBoard(board) || (board.region && !["global", "eu"].includes(board.region))) return [];
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
    // Greenhouse can publish an employer-hosted application URL, not just a greenhouse.io URL.
    // Only accept that link when its posting ID matches the API record; do not infer trust from hostname alone.
    const greenhouseUrl = typeof job.absolute_url === "string" ? job.absolute_url : "";
    const url = board.provider === "greenhouse"
      ? (officialGreenhousePostingUrl(greenhouseUrl, board, id) || safeEmployerApplicationUrl(greenhouseUrl, id))
      : leverPostingUrl(job.hostedUrl, board);
    if (!id || !title || !url || seen.has(url)) continue;
    seen.add(url);
    // updated_at is not a posting date; never mislabel it as one.
    const date = board.provider === "greenhouse" ? job.first_published : job.createdAt;
    output.push({id:`${board.provider}:${board.token}:${id}`,title,company:board.company,location,url,provider:board.provider,postedAt:postingDate(date)});
  }
  return output;
}
export function dedupePublicJobs(jobs: PublicJob[]): PublicJob[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  return jobs.filter(job => {
    const url = job.url.replace(/\/$/, "").toLowerCase();
    // ATS IDs include provider and board token. The same posting may have
    // multiple tracked URLs; do not count it as a second opportunity.
    if (seenUrls.has(url) || (job.id && seenIds.has(job.id))) return false;
    seenUrls.add(url);
    if (job.id) seenIds.add(job.id);
    return true;
  });
}
