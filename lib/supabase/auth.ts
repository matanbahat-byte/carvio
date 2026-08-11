import { createClient } from "./client";
import { createServerSupabaseClient } from "./server";

function requireBrowserClient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Cloud sync is not configured.");
  return supabase;
}

export async function signInWithMagicLink(email: string) {
  const supabase = requireBrowserClient();
  return supabase.auth.signInWithOtp({ email });
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = requireBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = requireBrowserClient();
  return supabase.auth.signOut();
}

export async function getServerSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
}
