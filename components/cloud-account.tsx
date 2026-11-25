"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CheckCircle2, Cloud, CloudOff, Download, LoaderCircle, LogOut, Mail, ShieldCheck, UploadCloud, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/auth-feedback";
import { emitProductEvent } from "@/lib/product-analytics";
import { createCloudSynchronizer, SyncConflictError, type SyncCheckpoint } from "@/lib/cloud-sync";
import { isCloudWorkspace, writeCloudWorkspace } from "@/lib/cloud-workspace";
import { LOCAL_WORKSPACE_OWNER_KEY } from "@/lib/workspace-access";

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
  searchTasks?: unknown[];
};

type SyncState = "idle" | "saving" | "saved" | "error";

export type CloudAccountStatus = {
  configured: boolean;
  email: string;
  syncState: SyncState;
  remoteExists: boolean | null;
  autoSync: boolean;
};

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
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("auth")) return "";
    return language === "he" ? "לא ניתן להשלים את הכניסה. בקשו קישור חדש ופתחו אותו באותו דפדפן, או המשיכו ללא חשבון." : "Sign-in couldn’t be completed. Request a new link and open it in the same browser, or continue without an account.";
  });
  const [sentTo, setSentTo] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (!retryAfter) return;
    const timer = window.setTimeout(() => setRetryAfter((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retryAfter]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const supabase = supabaseRef.current;
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data.url) window.location.assign(data.url);
    else throw new Error("Missing sign-in URL");
    } catch (error) {
      setMessage(authErrorMessage(error, language));
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || !email.trim() || busy || retryAfter > 0) return;
    setBusy(true);
    setMessage("");
    setSentTo("");
    try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    setSentTo(email.trim());
    setRetryAfter(60);
    setMessage(language === "he" ? "בדקו את תיבת הדואר וגם את תיקיית הספאם. פתחו את הקישור באותו דפדפן כדי להשלים את הכניסה. אין צורך בסיסמה." : "Check your inbox and spam folder. Open the link in this same browser to finish signing in. No password needed.");
    } catch (error) {
      setMessage(authErrorMessage(error, language));
    } finally {
      setBusy(false);
    }
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
      {showEmail && <form aria-busy={busy} className="welcome-email-form" onSubmit={sendMagicLink}><input aria-label={language === "he" ? "כתובת מייל" : "Email address"} autoComplete="email" disabled={busy} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email}/><button disabled={busy || retryAfter > 0} type="submit">{busy ? (language === "he" ? "מתחברים…" : "Connecting…") : retryAfter > 0 ? (language === "he" ? `שליחה חוזרת בעוד ${retryAfter} שניות` : `Resend in ${retryAfter}s`) : (language === "he" ? "שליחת קישור" : "Send link")}</button></form>}
      {message && <div className="welcome-auth-message" role="status">{sentTo && <strong>{language === "he" ? "בדקו את האימייל: " : "Check your email: "}{sentTo}</strong>}<p>{message}</p></div>}
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
  onStatusChange,
}: {
  language: "en" | "he";
  workspace: CloudWorkspacePayload;
  onRestore: (workspace: CloudWorkspacePayload) => void;
  onStatusChange?: (status: CloudAccountStatus) => void;
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
    const openAccount = (event: Event) => {
      const entryPoint = event instanceof CustomEvent && typeof event.detail?.entryPoint === "string"
        ? event.detail.entryPoint
        : "unknown";
      setOpen(true);
      emitProductEvent("cloud_account_opened", { method: entryPoint });
    };
    window.addEventListener("carvio:open-cloud-account", openAccount);
    return () => window.removeEventListener("carvio:open-cloud-account", openAccount);
  }, []);

  useEffect(() => {
    onStatusChange?.({
      configured,
      email: session?.user.email || "",
      syncState,
      remoteExists,
      autoSync,
    });
  }, [autoSync, configured, onStatusChange, remoteExists, session, syncState]);

  const workspaceRef = useRef(workspace);
  const restoreRef = useRef(onRestore);
  const accountRef = useRef<string | null>(null);
  const engineRef = useRef<ReturnType<typeof createCloudSynchronizer<CloudWorkspacePayload>> | null>(null);
  const languageRef = useRef(language);
  useEffect(() => { workspaceRef.current = workspace; restoreRef.current = onRestore; languageRef.current = language; }, [workspace, onRestore, language]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    let alive = true, changed = false;
    const apply = (next: Session | null) => {
      if (!alive) return;
      const id = next?.user.id || null;
      if (accountRef.current !== id) {
        engineRef.current?.cancel(); engineRef.current = null;
        accountRef.current = id;
        setRemoteExists(null); setSyncState("idle"); setMessage("");
        try {
          const preference = id ? localStorage.getItem(`carvio.cloud-autosync.v3:${id}`) : "off";
          setAutoSync(Boolean(id) && preference !== "off" && (preference === "on" || localStorage.getItem("carvio.cloud-autosync.v1") !== "off"));
        } catch { setAutoSync(false); setSyncState("error"); }
      }
      setSession(next);
    };
    void supabase.auth.getSession().then(({data})=>{if(!changed)apply(data.session);}).catch(()=>{if(!changed)apply(null);});
    const {data} = supabase.auth.onAuthStateChange((event,next)=>{changed=true;apply(next);if(event==="SIGNED_IN"&&next)emitProductEvent("cloud_sign_in_completed",{method:"authenticated"});});
    return ()=>{alive=false;engineRef.current?.cancel();data.subscription.unsubscribe();};
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || !autoSync) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;
    let active = true;
    const checkpointKey = `carvio.sync-checkpoint.v1:${userId}`;
    let checkpoint: SyncCheckpoint | null = null;
    try {
      if (localStorage.getItem(LOCAL_WORKSPACE_OWNER_KEY) !== userId) throw new Error("owner");
      const stored = JSON.parse(localStorage.getItem(checkpointKey) || "null");
      if (stored?.version === 1 && stored.userId === userId && typeof stored.node?.hash === "string" && stored.node?.kind === "object") checkpoint = stored;
    } catch { queueMicrotask(()=>{if(active){setSyncState("error");setMessage(languageRef.current === "he" ? "לא ניתן לאמת בעלות או גישה לשמירה המקומית. המידע לא נשלח לענן." : "Local ownership or storage could not be verified. No data was uploaded.");}});return ()=>{active=false;}; }
    let cached: {workspace: CloudWorkspacePayload; revision: string} | null = null;
    const engine = createCloudSynchronizer<CloudWorkspacePayload>({
      userId, checkpoint,
      isCurrent:()=>active && accountRef.current===userId && localStorage.getItem(LOCAL_WORKSPACE_OWNER_KEY)===userId,
      readLocal:()=>workspaceRef.current,
      preserveLocal:value=>localStorage.setItem(`carvio.cloud-recovery.v1:${userId}`,JSON.stringify({savedAt:new Date().toISOString(),workspace:value})),
      applyLocal:value=>{workspaceRef.current=value;restoreRef.current(value);},
      saveCheckpoint:value=>localStorage.setItem(checkpointKey,JSON.stringify(value)),
      readRemote:async()=>{
        const revision = await supabase.from("user_workspaces").select("updated_at").eq("user_id",userId).maybeSingle();
        if(revision.error)throw revision.error;
        if(!revision.data){setRemoteExists(false);cached=null;return null;}
        if(cached?.revision===revision.data.updated_at)return cached;
        const {data,error}=await supabase.from("user_workspaces").select("workspace_data, updated_at").eq("user_id",userId).maybeSingle();
        if(error)throw error;
        if(!data)return null;
        if(!isCloudWorkspace(data.workspace_data)||typeof data.updated_at!=="string")throw new Error("invalid-cloud-workspace");
        if(active)setRemoteExists(true);
        cached={workspace:data.workspace_data as CloudWorkspacePayload,revision:data.updated_at};return cached;
      },
      writeRemote:async(value,revision)=>{
        const result=await writeCloudWorkspace(supabase,{userId,updatedAt:revision},value);
        cached={workspace:value,revision:result.updatedAt!};return result.updatedAt!;
      },
    });
    engineRef.current=engine;
    const refresh=()=>{if(document.visibilityState==="visible")void saveToCloud();};
    const timer=window.setInterval(refresh,30000);
    window.addEventListener("focus",refresh);window.addEventListener("online",refresh);document.addEventListener("visibilitychange",refresh);
    void saveToCloud();
    return ()=>{active=false;engine.cancel();if(engineRef.current===engine)engineRef.current=null;window.clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("online",refresh);document.removeEventListener("visibilitychange",refresh);};
    // Identity and opt-out control the lifetime; current workspace/language are refs.
  }, [userId, autoSync]);

  useEffect(() => {
    if(!userId || !autoSync)return;
    const timer=window.setTimeout(()=>void saveToCloud(),700);
    return ()=>window.clearTimeout(timer);
  }, [workspace, userId, autoSync]);

  useEffect(() => {
    const disable=()=>{engineRef.current?.cancel();try{if(accountRef.current)localStorage.setItem(`carvio.cloud-autosync.v3:${accountRef.current}`,"off");}catch{setSyncState("error");}setAutoSync(false);};
    window.addEventListener("carvio:disable-cloud-autosync",disable);return ()=>window.removeEventListener("carvio:disable-cloud-autosync",disable);
  }, []);

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || !email.trim() || syncState === "saving") return;
    setSyncState("saving");
    setMessage("");
    try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    setSyncState("idle");
    emitProductEvent("cloud_sign_in_link_requested", { method: "email_link" });
    setMessage(language === "he" ? "בדקו את תיבת הדואר והספאם ופתחו את הקישור באותו דפדפן." : "Check your inbox and spam folder, then open the link in this same browser.");
    } catch (error) {
      setSyncState("error");
      setMessage(authErrorMessage(error, language));
    }
  }

  async function saveToCloud() {
    const id=accountRef.current,engine=engineRef.current;
    if(!id)return;
    if(!engine){
      try {localStorage.setItem(`carvio.cloud-autosync.v3:${id}`,"on");setAutoSync(true);} catch {setSyncState("error");}
      return;
    }
    setSyncState("saving");
    try {
      await engine.sync();
      if(accountRef.current!==id||engineRef.current!==engine)return;
      setRemoteExists(true);setSyncState("saved");
      setMessage(languageRef.current==="he"?"המידע מסונכרן עם החשבון, וזמין גם במכשירים אחרים המחוברים אליו.":"Your workspace is synced and available on other devices signed in to this account.");
    } catch(error){
      if(accountRef.current!==id||engineRef.current!==engine)return;
      setSyncState("error");
      setMessage(error instanceof SyncConflictError
        ? (languageRef.current==="he"?"אותו פרט השתנה בשני מכשירים. שני העותקים נשמרו; לא דרסנו מידע. הורידו עותק מקומי לפני פתרון ההתנגשות.":"The same information changed on two devices. Both copies are preserved; nothing was overwritten. Download a local copy before resolving the conflict.")
        : (languageRef.current==="he"?"לא ניתן לסנכרן כרגע. המידע נשמר במכשיר. ננסה שוב אוטומטית; אפשר להוריד עותק מקומי לשחזור.":"Sync is unavailable. Your data remains on this device. We will retry automatically; you can download a local recovery copy."));
    }
  }
  async function restoreFromCloud(){await saveToCloud();}
  function toggleAutoSync(){
    if(!userId)return;
    try{localStorage.setItem(`carvio.cloud-autosync.v3:${userId}`,autoSync?"off":"on");if(autoSync)engineRef.current?.cancel();setAutoSync(!autoSync);setSyncState("idle");}
    catch{setSyncState("error");}
  }
  function downloadLocalCopy(){
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,...workspaceRef.current})],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="carvio-local-recovery.json";link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function signOut(){engineRef.current?.cancel();await supabaseRef.current?.auth.signOut();setRemoteExists(null);setAutoSync(false);setOpen(false);}

  const buttonLabel = !configured || !session
    ? (language === "he" ? "נשמר במכשיר · התחברות לסנכרון" : "Saved on this device · Sign in to sync")
    : syncState === "saving" ? (language === "he" ? "מסנכרן…" : "Syncing…")
    : syncState === "error" ? (language === "he" ? "לא סונכרן · נשמר במכשיר" : "Not synced · Saved on this device")
    : !autoSync ? (language === "he" ? "סנכרון כבוי · נשמר במכשיר" : "Sync off · Saved on this device")
    : syncState === "saved" ? (language === "he" ? "מסונכרן לחשבון" : "Synced to your account")
    : (language === "he" ? "בודק סנכרון…" : "Checking sync…");

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
        if (!open) emitProductEvent("cloud_account_opened", { method: "hero" });
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
      {!configured ? <div className="cloud-local-note"><CloudOff className="h-5 w-5" /><p><strong>{language === "he" ? "מצב מקומי פעיל" : "Local mode is active"}</strong><span>{language === "he" ? "הכול ממשיך לעבוד ולהישמר בדפדפן. בעל האתר יכול להפעיל Supabase Free בהמשך." : "Everything keeps working in this browser. The owner can enable Supabase Free later."}</span></p></div> : !session ? <form onSubmit={sendMagicLink}><label>{language === "he" ? "מייל לקבלת קישור כניסה" : "Email for a secure sign-in link"}<span><Mail className="h-4 w-4" /><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} /></span></label><button disabled={syncState === "saving"} type="submit">{language === "he" ? "שליחת קישור כניסה" : "Email me a sign-in link"}</button><p>{language === "he" ? "אין סיסמה לזכור. החשבון דרוש רק לסנכרון בין מכשירים." : "No password to remember. An account is only needed for cross-device sync."}</p></form> : <div className="cloud-session"><p className="cloud-session-email"><CheckCircle2 className="h-4 w-4" />{session.user.email}</p>{remoteExists === false && <div className="cloud-choice"><strong>{language === "he" ? "זהו החשבון הראשון שלכם" : "This is your first cloud backup"}</strong><span>{language === "he" ? "שמרו את המידע שכבר נמצא במכשיר הזה." : "Start by backing up the data already on this device."}</span></div>}<div className="cloud-account-actions"><button onClick={() => void saveToCloud()} type="button"><UploadCloud className="h-4 w-4" />{language === "he" ? "סנכרון עכשיו" : "Sync now"}</button><button onClick={() => void restoreFromCloud()} type="button"><Download className="h-4 w-4" />{language === "he" ? "בדיקת עדכונים מהענן" : "Check cloud updates"}</button></div><label className="cloud-autosync"><input checked={autoSync} onChange={toggleAutoSync} type="checkbox" /><span><strong>{language === "he" ? "סנכרון אוטומטי" : "Automatic sync"}</strong><small>{language === "he" ? "שמירה וטעינה בין מכשירים המחוברים לאותו חשבון" : "Save and load changes across devices signed in to the same account"}</small></span></label><button className="cloud-signout" onClick={downloadLocalCopy} type="button"><Download className="h-4 w-4" />{language === "he" ? "הורדת עותק מקומי לשחזור" : "Download a local recovery copy"}</button><button className="cloud-signout" onClick={() => void signOut()} type="button"><LogOut className="h-4 w-4" />{language === "he" ? "יציאה מהחשבון" : "Sign out"}</button></div>}
      {message && <p className={`cloud-message ${syncState === "error" ? "cloud-message-error" : ""}`}>{message}</p>}
      </section>
    </div>, document.body) : null}
  </>;
}
