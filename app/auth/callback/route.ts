import { NextResponse } from "next/server";
import { createServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!isServerSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/?workspace=1&cloud=unavailable", url.origin));
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/?workspace=1&cloud=connected", url.origin));
}
