"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CheckCircle2, Cloud, CloudOff, Download, LoaderCircle, LogOut, Mail, ShieldCheck, UploadCloud, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type CloudWorkspacePayload = {
  schemaVersion: 1;
  applications: unknown[];
  contacts: unknown[];
  resumes: unknown[];
  searchProfile: unknown;
  recoveryEntries: unknown[];
  userProfile: unknown;
  dailyMood: string;
  language: "en" | "he";
  theme: string;
  actionEvents: unknown[];
};

type SyncState = "idle" | "saving" | "saved" | "error";

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52a4.7 4.7 0 0 1-2.05 3.08l-.02.11 2.98 2.31.2.02c1.83-1.7 2.97-4.19 2.97-7.15Z" fill="#4285F4"/><path d="M12 22c2.69 0 4.94-.88 6.59-2.62l-3.16-2.44c-.85.58-1.98.98-3.43.98a5.95 5.95 0 0 1-5.63-4.11l-.1.01-3.1 2.4-.04.1A9.95 9.95 0 0 0 12 22Z" fill="#34A853"/><path d="M6.37 13.81A6.18 6.18 0 0 1 6.04 12c0-.63.12-1.24.32-1.81v-.12L3.22 7.63l-.1.05A10.04 10.04 0 0 0 2 12c0 1.56.36 3.03 1.13 4.32l3.24-2.51Z" fill="#FBBC05"/><path d="M12 6.08c1.88 0 3.15.81 3.88 1.48l2.78-2.71C16.95 3.26 14.69 2 12 2a9.95 9.95 0 0 0-8.87 5.68l3.23 2.51A5.97 5.97 0 0 1 12 6.08Z" fill="#EA4335"/></svg>;
}

export function WelcomeAccountAccess({ language, onContinueLocal }: { language: "en" | "he"; onContinueLocal: () => void }) {
  const configured = isSupabaseConfigured();
  const supabaseRef = useRef(createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  }

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    setMessage(error ? error.message : language === "he" ? "קישור כניסה מאובטח נשלח למייל." : "A secure sign-in link is on its way.");
  }

  if (session) {
    return <div className="welcome-account-access welcome-account-session">
      <span><CheckCircle2 />{language === "he" ? "מחוברים בתור" : "Signed in as"} <strong>{session.user.email}</strong></span>
      <button className="welcome-google-button" onClick={onContinueLocal} type="button">{language === "he" ? "כניסה לסביבת העבודה" : "Open my Carvio workspace"}<ArrowUpRight /></button>
    </div>;
  }

  return <div className="welcome-account-access">
    {configured && <>
      <button className="welcome-google-button" disabled={busy} onClick={() => void signInWithGoogle()} type="button"><GoogleMark />{language === "he" ? "המשך באמצעות Google" : "Continue with Google"}</button>
      <button className="welcome-email-toggle" onClick={() => setShowEmail((current) => !current)} type="button"><Mail />{language === "he" ? "או קישור כניסה במייל" : "Or use a secure email link"}</button>
      {showEmail && <form className="welcome-email-form" onSubmit={sendMagicLink}><input aria-label={language === "he" ? "כתובת מייל" : "Email address"} autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email}/><button disabled={busy} type="submit">{language === "he" ? "שליחת קישור" : "Send link"}</button></form>}
      {message && <p className="welcome-auth-message">{message}</p>}
      <div className="welcome-access-divider"><span>{language === "he" ? "או" : "or"}</span></div>
    </>}
    <button className="welcome-local-button" onClick={onContinueLocal} type="button">{language === "he" ? "המשך ללא חשבון במכשיר הזה" : "Continue on this device without an account"}</button>
    <small><ShieldCheck />{language === "he" ? "אפשר להתחבר ולסנכרן גם מאוחר יותר. שום מידע מקומי לא יימחק." : "You can sign in and sync later. Your local data will not be deleted."}</small>
  </div>;
}

export function CloudAccount({
  language,
  workspace,
  onRestore,
}: {
  language: "en" | "he";
  workspace: CloudWorkspacePayload;
  onRestore: (workspace: CloudWorkspacePayload) => void;
}) {
  const configured = isSupabaseConfigured();
  const supabaseRef = useRef(createClient());
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const [remoteExists, setRemoteExists] = useState<boolean | null>(null);
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;
    supabase
      .from("user_workspaces")
      .select("updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        const exists = Boolean(data);
        setRemoteExists(exists);
        setAutoSync(window.localStorage.getItem("carvio.cloud-autosync.v1") === "on" && exists);
      });
  }, [session]);

  useEffect(() => {
    if (!session || !autoSync || !remoteExists) return;
    const timeout = window.setTimeout(() => void saveToCloud(true), 1400);
    return () => window.clearTimeout(timeout);
    // workspace is intentionally the trigger for the debounced backup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, session, autoSync, remoteExists]);

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || !email.trim()) return;
    setSyncState("saving");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSyncState(error ? "error" : "idle");
    setMessage(error ? error.message : language === "he" ? "שלחנו קישור כניסה מאובטח למייל." : "A secure sign-in link is on its way.");
  }

  async function saveToCloud(silent = false) {
    const supabase = supabaseRef.current;
    if (!supabase || !session) return;
    setSyncState("saving");
    const { error } = await supabase.from("user_workspaces").upsert({
      user_id: session.user.id,
      schema_version: workspace.schemaVersion,
      workspace_data: workspace,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSyncState("error");
      if (!silent) setMessage(error.message);
      return;
    }
    setRemoteExists(true);
    setSyncState("saved");
    if (!silent) setMessage(language === "he" ? "המידע במכשיר גובה לענן." : "This device is backed up to the cloud.");
  }

  async function restoreFromCloud() {
    const supabase = supabaseRef.current;
    if (!supabase || !session) return;
    setSyncState("saving");
    const { data, error } = await supabase
      .from("user_workspaces")
      .select("workspace_data")
      .eq("user_id", session.user.id)
      .single();
    if (error || !data?.workspace_data) {
      setSyncState("error");
      setMessage(error?.message || (language === "he" ? "לא נמצא גיבוי בענן." : "No cloud backup was found."));
      return;
    }
    onRestore(data.workspace_data as CloudWorkspacePayload);
    setSyncState("saved");
    setMessage(language === "he" ? "הגיבוי מהענן נטען למכשיר הזה." : "The cloud backup is now on this device.");
  }

  function toggleAutoSync() {
    const next = !autoSync;
    setAutoSync(next);
    window.localStorage.setItem("carvio.cloud-autosync.v1", next ? "on" : "off");
    if (next && !remoteExists) void saveToCloud();
  }

  async function signOut() {
    await supabaseRef.current?.auth.signOut();
    setRemoteExists(null);
    setAutoSync(false);
    setOpen(false);
  }

  const buttonLabel = !configured
    ? language === "he" ? "נשמר במכשיר" : "Saved locally"
    : session
      ? syncState === "saving" ? (language === "he" ? "שומר…" : "Saving…") : (language === "he" ? "ענן" : "Cloud")
      : language === "he" ? "גיבוי בענן" : "Cloud backup";

  return <>
    <div className="cloud-account">
    <button
      aria-controls="cloud-account-dialog"
      aria-expanded={open}
      aria-haspopup="dialog"
      className="hero-cloud-button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      type="button"
    >
      {syncState === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : configured ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      <span>{buttonLabel}</span>
    </button>
    </div>
    {open && typeof document !== "undefined" ? createPortal(<div className="cloud-account-layer">
      <button
        aria-label={language === "he" ? "סגירת חלון הגיבוי" : "Close cloud backup"}
        className="cloud-account-backdrop"
        onClick={() => setOpen(false)}
        type="button"
      />
      <section
        aria-label={language === "he" ? "חשבון וגיבוי בענן" : "Account and cloud backup"}
        aria-modal="true"
        className="cloud-account-panel"
        id="cloud-account-dialog"
        role="dialog"
      >
      <div className="cloud-account-heading"><div><ShieldCheck className="h-5 w-5" /><span><strong>{language === "he" ? "המידע שלכם, בשליטתכם" : "Your data, under your control"}</strong><small>{language === "he" ? "המשך מקומי או סנכרון אופציונלי" : "Stay local or add optional sync"}</small></span></div><button aria-label="Close" onClick={() => setOpen(false)} type="button"><X className="h-4 w-4" /></button></div>
      {!configured ? <div className="cloud-local-note"><CloudOff className="h-5 w-5" /><p><strong>{language === "he" ? "מצב מקומי פעיל" : "Local mode is active"}</strong><span>{language === "he" ? "הכול ממשיך לעבוד ולהישמר בדפדפן. בעל האתר יכול להפעיל Supabase Free בהמשך." : "Everything keeps working in this browser. The owner can enable Supabase Free later."}</span></p></div> : !session ? <form onSubmit={sendMagicLink}><label>{language === "he" ? "מייל לקבלת קישור כניסה" : "Email for a secure sign-in link"}<span><Mail className="h-4 w-4" /><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} /></span></label><button disabled={syncState === "saving"} type="submit">{language === "he" ? "שליחת קישור כניסה" : "Email me a sign-in link"}</button><p>{language === "he" ? "אין סיסמה לזכור. החשבון דרוש רק לסנכרון בין מכשירים." : "No password to remember. An account is only needed for cross-device sync."}</p></form> : <div className="cloud-session"><p className="cloud-session-email"><CheckCircle2 className="h-4 w-4" />{session.user.email}</p>{remoteExists === false && <div className="cloud-choice"><strong>{language === "he" ? "זהו החשבון הראשון שלכם" : "This is your first cloud backup"}</strong><span>{language === "he" ? "שמרו את המידע שכבר נמצא במכשיר הזה." : "Start by backing up the data already on this device."}</span></div>}<div className="cloud-account-actions"><button onClick={() => void saveToCloud()} type="button"><UploadCloud className="h-4 w-4" />{language === "he" ? "גיבוי המכשיר לענן" : "Back up this device"}</button><button disabled={!remoteExists} onClick={() => void restoreFromCloud()} type="button"><Download className="h-4 w-4" />{language === "he" ? "טעינה מהענן" : "Restore from cloud"}</button></div><label className="cloud-autosync"><input checked={autoSync} disabled={!remoteExists} onChange={toggleAutoSync} type="checkbox" /><span><strong>{language === "he" ? "סנכרון אוטומטי" : "Automatic sync"}</strong><small>{language === "he" ? "שינויים יגובו לאחר השמירה המקומית" : "Changes are backed up after local save"}</small></span></label><button className="cloud-signout" onClick={() => void signOut()} type="button"><LogOut className="h-4 w-4" />{language === "he" ? "יציאה מהחשבון" : "Sign out"}</button></div>}
      {message && <p className={`cloud-message ${syncState === "error" ? "cloud-message-error" : ""}`}>{message}</p>}
      </section>
    </div>, document.body) : null}
  </>;
}
