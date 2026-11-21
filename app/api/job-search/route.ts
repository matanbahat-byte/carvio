import { createServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { createJobSearchService, parseJobSearchInput } from "@/lib/job-results-service";

const search = createJobSearchService();
const headers = { "Cache-Control": "private, no-store" };
const configured = () => process.env.JOB_SEARCH_ENABLED === "true" && Boolean(process.env.SERPAPI_API_KEY) && Boolean(process.env.JOB_SEARCH_ALLOWED_USER_IDS?.trim()) && isServerSupabaseConfigured();

export async function GET() {
  return Response.json({ available: configured() }, { headers });
}

export async function POST(request: Request) {
  if (!configured()) return Response.json({ status: "not-configured", jobs: [] }, { headers });
  // Only same-origin, authenticated searches can use provider quota.
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ status: "unavailable", jobs: [] }, { status: 403, headers });
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return Response.json({ status: "sign-in-required", jobs: [] }, { status: 401, headers });
    const allowed = (process.env.JOB_SEARCH_ALLOWED_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
    if (!allowed.length || !allowed.includes(data.user.id)) return Response.json({ status: "limited", jobs: [] }, { status: 403, headers });
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Invalid input");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 8000) { await reader.cancel(); throw new Error("Invalid input"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const input = parseJobSearchInput(JSON.parse(new TextDecoder().decode(bytes)));
    if (!input) throw new Error("Invalid input");
    const result = await search(data.user.id, input.profile, input.language, process.env.SERPAPI_API_KEY!);
    return Response.json(result, { status: result.status === "limited" ? 429 : result.status === "unavailable" ? 503 : 200, headers });
  } catch { return Response.json({ status: "unavailable", jobs: [] }, { status: 400, headers }); }
}
