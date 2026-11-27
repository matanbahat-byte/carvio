"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SearchProfile } from "@/lib/job-search";

const SEEN = "carvio.job-radar.offered.v1";
type Preferences = { role: string; country: string; city: string; workModel: string; seniority: string; employmentType: string };
const preferences = (p: SearchProfile): Preferences => ({ role: p.role, country: p.country, city: p.location, workModel: p.workModel, seniority: p.seniority, employmentType: p.employmentType });

export function JobRadar({ language, profile, successfulSearch = false, openSettings = false }: { language: "he" | "en"; profile: SearchProfile; successfulSearch?: boolean; openSettings?: boolean }) {
  const he = language === "he";
  const t = (a: string, b: string) => he ? a : b;
  const [ready, setReady] = useState(false);
  const [offer, setOffer] = useState(false);
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<Preferences>(preferences(profile));
  const [frequency, setFrequency] = useState(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const userId = useRef<string | null>(null);
  const generation = useRef(0);
  const offered = useRef(false);

  useEffect(() => {
    const client = createClient();
    let alive = true;
    async function load() {
      const version = ++generation.current;
      setReady(false); setActive(false); setEditing(false); setOffer(false); setMessage("");
      userId.current = null;
      try {
        const result = client ? await client.auth.getUser() : null;
        const user = result?.data.user;
        if (!alive || version !== generation.current) return;
        if (user?.email_confirmed_at && !user.is_anonymous) {
          userId.current = user.id;
          const { data, error } = await client!.from("job_radar_preferences").select("enabled,preferences,frequency_per_week").eq("user_id", user.id).maybeSingle();
          if (!alive || version !== generation.current) return;
          if (error) { setMessage(t("לא ניתן לטעון התראות כרגע. נסו שוב מאוחר יותר.", "Unable to load alerts right now. Please try again later.")); return; }
          if (data) { setActive(data.enabled); setDraft(data.preferences); setFrequency(data.frequency_per_week); offered.current = true; }
        }
        setReady(true); setEditing(openSettings);
      } catch { if (alive) setMessage(t("לא ניתן לטעון התראות כרגע.", "Unable to load alerts right now.")); }
    }
    void load();
    const subscription = client?.auth.onAuthStateChange(() => { void load(); }).data.subscription;
    return () => { alive = false; generation.current++; subscription?.unsubscribe(); };
  // Language changes must not reset an open editor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !successfulSearch || offered.current) return;
    offered.current = true;
    try { if (localStorage.getItem(SEEN)) return; localStorage.setItem(SEEN, "1"); } catch { /* Session suppression still applies. */ }
    setDraft(preferences(profile)); setOffer(true);
  }, [ready, successfulSearch, profile]);

  async function save(enabled: boolean) {
    const client = createClient();
    if (!client || !userId.current) { setMessage(t("כדי לשמור התראות, התחברו עם מייל מאומת בסביבת העבודה ואז בחרו שוב להפעיל אותן.", "To save alerts, sign in with a verified email in the workspace, then choose to enable them again.")); return; }
    const version = generation.current;
    setBusy(true); setMessage("");
    try {
      const { error } = await client.rpc("save_job_radar_preferences", { p_enabled: enabled, p_preferences: draft, p_frequency: frequency, p_language: language, p_consent_version: "job-radar-v1" });
      if (version !== generation.current) return;
      if (error) throw error;
      setActive(enabled); setEditing(false); setOffer(false);
      setMessage(t(enabled ? "ההעדפות נשמרו. Job Radar בהכנה; שליחת התראות עדיין לא פעילה." : "ההתראות הופסקו.", enabled ? "Preferences saved. Job Radar is being prepared; alerts are not being sent yet." : "Alerts stopped."));
    } catch { if (version === generation.current) setMessage(t("השמירה נכשלה. נסו שוב; לא הוצג אישור שמירה.", "Saving failed. Please try again; your change has not been confirmed.")); }
    finally { setBusy(false); }
  }

  const button = "min-h-11 rounded-xl border border-teal-700 px-4 py-2 font-bold disabled:opacity-50";
  return <section aria-label="Job Radar" dir={he ? "rtl" : "ltr"} className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-teal-200 bg-[#f0fdfa] p-4 text-base text-[#134e4a] sm:p-6">
    {offer && !editing ? <><h2 className="text-xl font-bold">{t("אנחנו נמשיך לחפש בשבילך!", "We’ll keep searching for you!")}</h2><p className="my-3">{t("רוצה ש־CARVIO ישלח לך למייל משרות חדשות שמתאימות לחיפוש שלך, 2–3 פעמים בשבוע?", "Want CARVIO to email you new jobs matching your search, 2–3 times a week?")}</p><div className="flex flex-wrap gap-3"><button className={`${button} bg-teal-700 text-white`} onClick={() => setEditing(true)}>{t("כן, חפשו בשבילי!", "Yes, search for me!")}</button><button className={button} onClick={() => setOffer(false)}>{t("אולי בהמשך", "Maybe later")}</button></div></> : !editing && <button className={button} disabled={!ready} onClick={() => { if (!active) setDraft(preferences(profile)); setEditing(true); }}>{t("Job Radar · ניהול התראות משרות", "Job Radar · Manage job alerts")}</button>}
    {editing && <form className="grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); void save(true); }}>
      <h2 className="text-xl font-bold">{t("משרות שמתאימות לך", "Jobs that fit you")}</h2>
      <p>{t("Job Radar בהכנה. אפשר לשמור העדפות והסכמה כעת; עדיין לא נשלחים מיילים. אפשר לשנות או להפסיק כאן בכל עת.", "Job Radar is being prepared. Save preferences and consent now; no emails are sent yet. You can change or stop alerts here anytime.")}</p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">{([["role", t("תפקיד", "Role")], ["country", t("מדינה", "Country")], ["city", t("עיר", "City")], ["workModel", t("מודל עבודה", "Work model")], ["seniority", t("דרגה", "Seniority")], ["employmentType", t("סוג משרה", "Employment type")]] as [keyof Preferences, string][]).map(([key, label]) => <label key={key} className="grid min-w-0 gap-1">{label}<input className="min-h-11 w-full min-w-0 rounded-lg border border-teal-700 bg-white px-3 text-[#134e4a]" required={key === "role" || key === "country"} maxLength={120} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></label>)}</div>
      <label className="grid gap-1">{t("כמה פעמים בשבוע?", "How often?")}<select className="min-h-11 rounded-lg border border-teal-700 bg-white p-2 text-[#134e4a]" value={frequency} onChange={e => setFrequency(Number(e.target.value))}><option value={2}>{t("פעמיים בשבוע", "Twice a week")}</option><option value={3}>{t("3 פעמים בשבוע", "3 times a week")}</option></select></label>
      <p>{t("בלחיצה על הפעלה ושמירה אני מסכים/ה לקבל למייל החשבון משרות בהתאם להעדפות ולתדירות שבחרתי.", "By choosing Enable and save, I agree to receive jobs at my account email according to my preferences and frequency.")}</p>
      {!userId.current && <a className="underline" href={`/?workspace=1&findLang=${language}`}>{t("כניסה לסביבת העבודה להתחברות", "Open workspace to sign in")}</a>}
      <div className="flex flex-wrap gap-3"><button disabled={busy} className={`${button} bg-teal-700 text-white`} type="submit">{t("הפעלה ושמירה", "Enable and save")}</button>{active && <button disabled={busy} className={button} type="button" onClick={() => void save(false)}>{t("הפסקת התראות", "Stop alerts")}</button>}<button disabled={busy} className={button} type="button" onClick={() => { setEditing(false); setOffer(false); }}>{t("סגירה", "Close")}</button></div>
    </form>}
    {message && <p role="status" className="mt-3 break-words">{message}</p>}
  </section>;
}
