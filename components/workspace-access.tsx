"use client";

import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LOCAL_WORKSPACE_OWNER_KEY, resolveWorkspaceAccess, type WorkspaceAccess } from "@/lib/workspace-access";
import { authErrorMessage } from "@/lib/supabase/auth-feedback";

/** Mount before Home's local hydration; unmount all sensitive state on auth change. */
export function WorkspaceAccessGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<WorkspaceAccess | "loading">("loading");
  const [identity, setIdentity] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "he">("en");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supabaseRef = useRef(createClient());
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let cleanup = () => {};
    const timer = window.setTimeout(() => { cleanup = initialize() || (() => {}); }, 0);
    function initialize() {
    const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) { setAccess("ready"); return; }
    try { setLanguage(window.localStorage.getItem("carvio.language.v1") === '"he"' ? "he" : "en"); } catch { /* ownership check fails closed below */ }
    let alive = true;
    let authChanged = false;
    let currentId: string | null = null;
    const applyIdentity = (id: string | null) => {
      if (!alive) return;
      currentId = id;
      setIdentity(id);
      setMessage("");
      setAccess(resolveWorkspaceAccess(window.localStorage, id));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_WORKSPACE_OWNER_KEY || event.key === null) applyIdentity(currentId);
    };
    window.addEventListener("storage", onStorage);
    const supabase = supabaseRef.current;
    if (!supabase) {
      applyIdentity(null);
      return () => { alive = false; window.removeEventListener("storage", onStorage); };
    }
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive || authChanged) return;
      if (error) { setAccess("unavailable"); return; }
      applyIdentity(data.session?.user.id || null);
    }).catch(() => { if (alive && !authChanged) setAccess("unavailable"); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      applyIdentity(session?.user.id || null);
    });
    return () => { alive = false; data.subscription.unsubscribe(); window.removeEventListener("storage", onStorage); };
    }
    return () => { window.clearTimeout(timer); cleanup(); };
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      setMessage(language === "he" ? "בדקו את האימייל ופתחו את הקישור באותו דפדפן." : "Check your email and open the sign-in link in this browser.");
    } catch (error) { setMessage(authErrorMessage(error, language)); }
    finally { setBusy(false); }
  }

  async function googleSignIn() {
    const supabase = supabaseRef.current;
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true } });
      if (error) throw error;
      if (!data.url) throw new Error("Missing sign-in URL");
      window.location.assign(data.url);
    } catch (error) { setMessage(authErrorMessage(error, language)); setBusy(false); }
  }

  if (access === "ready") return <div key={identity || "local"}>{children}</div>;
  if (access === "loading") return <main className="min-h-screen bg-slate-50" aria-label="Checking workspace access" />;
  return <main lang={language} dir={language === "he" ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
    <section className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-sm" aria-labelledby="workspace-locked-title">
      <p className="mb-4 font-bold text-violet-700">CARVIO</p>
      <h1 id="workspace-locked-title" className="text-2xl font-bold">{language === "he" ? "סביבת העבודה המקומית נעולה" : "This local workspace is locked"}</h1>
      <p className="my-5 leading-7">{access === "unavailable"
        ? language === "he" ? "לא ניתן לאמת את הגישה כרגע. הנתונים נשמרו ולא הוחלפו. נסו שוב לאחר בדיקת החיבור והגדרות האחסון בדפדפן." : "Access could not be verified. Your data is preserved. Check your connection and browser storage settings, then retry."
        : language === "he" ? "המידע במכשיר הזה שייך לחשבון אחר. התחברו לחשבון ששמר אותו כדי להמשיך. הנתונים לא יימחקו ולא יועברו לחשבון אחר." : "Data on this device belongs to a different account. Sign in to the account that saved it to continue. Your data will not be deleted or transferred."}</p>
      {identity ? <button className="secondary-button" type="button" onClick={() => void supabaseRef.current?.auth.signOut().catch(() => setMessage(language === "he" ? "היציאה נכשלה. נסו שוב." : "Sign-out failed. Please retry."))}>{language === "he" ? "יציאה והתחברות לחשבון המקורי" : "Sign out to use the original account"}</button> : configured && <>
        <button className="primary-button mb-4 w-full" disabled={busy} type="button" onClick={() => void googleSignIn()}>{language === "he" ? "כניסה באמצעות Google" : "Sign in with Google"}</button>
        <form className="grid gap-3" onSubmit={signIn}>
          <label>{language === "he" ? "מייל החשבון המקורי" : "Original account email"}<input className="mt-2 w-full rounded-xl border p-3" autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
          <button className="secondary-button" disabled={busy} type="submit">{language === "he" ? "שליחת קישור כניסה" : "Email a sign-in link"}</button>
        </form>
      </>}
      <p className="mt-4" role="status">{message}</p>
      <div className="mt-6 flex flex-wrap gap-4"><a className="font-bold text-violet-700 underline" href="/find">{language === "he" ? "חיפוש משרות ללא פתיחת הנתונים" : "Search jobs without unlocking data"}</a><button className="underline" type="button" onClick={() => window.location.reload()}>{language === "he" ? "ניסיון נוסף" : "Retry"}</button></div>
    </section>
  </main>;
}
