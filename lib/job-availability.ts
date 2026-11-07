export type VerifiedJobDetails = { role: string; company: string; location: string };
export type Availability = { status: "published" | "not-published" | "unknown"; reason: "listed" | "absent" | "unsupported" | "unreachable"; checkedAt: string; details?: VerifiedJobDetails };
type Target = { provider: "greenhouse" | "lever"; id: string; detail: string; board: string };

// Construct requests only to fixed public ATS API hosts, never to the supplied URL.
export function availabilityTarget(input: string): Target | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const safe = /^[a-zA-Z0-9_-]+$/;
    if (!parts[0] || !safe.test(parts[0])) return null;
    if (["boards.greenhouse.io", "job-boards.greenhouse.io"].includes(url.hostname) && parts.length === 3 && parts[1] === "jobs" && /^\d+$/.test(parts[2])) {
      const board = `https://boards-api.greenhouse.io/v1/boards/${parts[0]}/jobs`;
      return { provider: "greenhouse", id: parts[2], board, detail: `${board}/${parts[2]}` };
    }
    if (["jobs.lever.co", "jobs.eu.lever.co"].includes(url.hostname) && parts.length === 2 && /^[a-f0-9-]{36}$/i.test(parts[1])) {
      const host = url.hostname === "jobs.eu.lever.co" ? "api.eu.lever.co" : "api.lever.co";
      const board = `https://${host}/v0/postings/${parts[0]}?mode=json`;
      return { provider: "lever", id: parts[1], board, detail: `https://${host}/v0/postings/${parts[0]}/${parts[1]}?mode=json` };
    }
  } catch { /* Unsupported input is never fetched. */ }
  return null;
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json") || !response.body) throw new Error("Invalid response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) throw new Error("Response too large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(all));
}

function verifiedField(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text.length <= 300 ? text : "";
}

export async function checkJobAvailability(input: string, request: typeof fetch = fetch): Promise<Availability> {
  const checkedAt = new Date().toISOString();
  const result = (status: Availability["status"], reason: Availability["reason"]): Availability => ({ status, reason, checkedAt });
  const target = availabilityTarget(input);
  if (!target) return { status: "unknown", reason: "unsupported", checkedAt: "" };
  const signal = AbortSignal.timeout(7000);
  const options: RequestInit = { redirect: "error", cache: "no-store", signal, headers: { Accept: "application/json" } };
  try {
    const response = await request(target.detail, options);
    if (response.ok) {
      const job = await boundedJson(response) as {
        id?: unknown;
        title?: unknown;
        text?: unknown;
        company_name?: unknown;
        location?: { name?: unknown };
        categories?: { location?: unknown };
      } | null;
      const lever = target.provider === "lever";
      const role = verifiedField(lever ? job?.text : job?.title);
      if (!job || String(job.id) !== target.id || !role) return result("unknown", "unreachable");
      return {
        ...result("published", "listed"),
        details: {
          role,
          company: lever ? "" : verifiedField(job.company_name),
          location: verifiedField(lever ? job.categories?.location : job.location?.name),
        },
      };
    }
    // A missing/blocked endpoint alone is not evidence of closure. Confirm a
    // valid public board before calling the posting no longer published.
    if (response.status !== 404 && response.status !== 410) return result("unknown", "unreachable");
    const boardResponse = await request(target.board, options);
    if (!boardResponse.ok) return result("unknown", "unreachable");
    const payload = await boundedJson(boardResponse);
    const jobs: unknown = target.provider === "lever" ? payload : (payload as { jobs?: unknown })?.jobs;
    if (!Array.isArray(jobs) || !jobs.every(job => job && typeof job === "object" && "id" in job)) return result("unknown", "unreachable");
    return jobs.some(job => String(job.id) === target.id) ? result("published", "listed") : result("not-published", "absent");
  } catch { return result("unknown", "unreachable"); }
}
