import { NextResponse } from "next/server";
import { createServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (!isServerSupabaseConfigured()) return redirect("/?auth=unavailable");
  if (!code || url.searchParams.has("error")) return redirect("/?auth=failed");
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) return redirect("/?auth=failed");
    return redirect("/?workspace=1&cloud=connected");
  } catch {
    return redirect("/?auth=unavailable");
  }
}
