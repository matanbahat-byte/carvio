import { checkJobAvailability } from "@/lib/job-availability";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // Bound input before parsing; no URL, credentials or job text is logged.
  if (Number(request.headers.get("content-length")) > 5000) return Response.json({ error: "Invalid input" }, { status: 400, headers });
  try {
    const text = await request.text();
    if (text.length > 5000) throw new Error("Invalid input");
    const body = JSON.parse(text);
    if (typeof body?.url !== "string" || body.url.length > 2048) throw new Error("Invalid input");
    return Response.json(await checkJobAvailability(body.url), { headers });
  } catch { return Response.json({ error: "Invalid input" }, { status: 400, headers }); }
}
