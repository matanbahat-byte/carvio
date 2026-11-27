"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {readRadarWorkspace,radarJobAvailable,type RadarRecentJob} from "@/lib/job-radar-workspace";
import type { SearchProfile } from "@/lib/job-search";

const SEEN = "carvio.job-radar.offered.v1";
type Preferences = { role: string; country: string; city: string; workModel: string; seniority: string; employmentType: string };
const preferences = (p: SearchProfile): Preferences => ({ role: p.role, country: p.country, city: p.location, workModel: p.workModel, seniority: p.seniority, employmentType: p.employmentType });

export function JobRadar({ language, profile, successfulSearch = false, openSettings = false, onSelectJob }: { language: "he" | "en"; profile: SearchProfile; successfulSearch?: boolean; openSettings?: boolean; onSelectJob?:(job:RadarRecentJob)=>void }) {
  const he = language === "he";
  const t = (a: string, b: string) => he ? a : b;
  const [ready, setReady] = useState(false);
  const [offer, setOffer] = useState(false);
  const [editing, setEditing] = useState(false);
  const [runtimeEnabled,setRuntimeEnabled]=useState(false);
  const [recent,setRecent]=useState<RadarRecentJob[]>([]);
  const [historyError,setHistoryError]=useState(false);
  const [hasPreferences,setHasPreferences]=useState(false);
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<Preferences>(preferences(profile));
  const [frequency, setFrequency] = useState(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saved=useRef<{draft:Preferences;frequency:number}|null>(null);
  const userId = useRef<string | null>(null);
  const generation = useRef(0);
  const offered = useRef(false);

  useEffect(() => {
    const client = createClient();
    let alive = true;
    async function load() {
      const version = ++generation.current;
      setReady(false); setRecent([]);setHistoryError(false);setRuntimeEnabled(false);setHasPreferences(false);setBusy(false);setDraft(preferences(profile));setFrequency(3);setActive(false); setEditing(false); setOffer(false); setMessage("");
      userId.current = null;saved.current=null;
      try {
        const result = client ? await client.auth.getUser() : null;
        const user = result?.data.user;
        if (!alive || version !== generation.current) return;
        if (user?.email_confirmed_at && !user.is_anonymous) {
          userId.current = user.id;
          const { data, error } = await client!.from("job_radar_preferences").select("enabled,preferences,frequency_per_week").eq("user_id", user.id).maybeSingle();
          if (!alive || version !== generation.current) return;
          if (error) { setMessage(t("לא ניתן לטעון התראות כרגע. נסו שוב מאוחר יותר.", "Unable to load alerts right now. Please try again later.")); return; }
          if (data) { saved.current={draft:data.preferences,frequency:data.frequency_per_week};setHasPreferences(true);setActive(data.enabled); setDraft(data.preferences); setFrequency(data.frequency_per_week); offered.current = true; }
          const history=await client!.rpc("get_job_radar_workspace").abortSignal(AbortSignal.timeout(5000));
          if(!alive||version!==generation.current)return;
          if(history.error)setHistoryError(true);else {const summary=readRadarWorkspace(history.data);setRecent(summary.jobs);setRuntimeEnabled(summary.runtimeEnabled);}
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
      if(enabled)saved.current={draft:{...draft},frequency};else if(saved.current){setDraft(saved.current.draft);setFrequency(saved.current.frequency);}
      setHasPreferences(true);setActive(enabled); setEditing(false); setOffer(false);
      setMessage(t(enabled ? "ההעדפות נשמרו. מצב המנגנון מוצג למעלה." : "ההתראות הופסקו.", enabled ? "Preferences saved. The current mechanism status is shown above." : "Alerts stopped."));
    } catch { if (version === generation.current) setMessage(t("השמירה נכשלה. נסו שוב; לא הוצג אישור שמירה.", "Saving failed. Please try again; your change has not been confirmed.")); }
    finally { if(version===generation.current)setBusy(false); }
  }

  const button = "min-h-11 rounded-xl border border-teal-700 px-4 py-2 font-bold disabled:opacity-50";
  return <section aria-label="Job Radar" dir={he ? "rtl" : "ltr"} className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-teal-200 bg-[#f0fdfa] p-4 text-base text-[#134e4a] sm:p-6">
    <h2 className="text-xl font-bold">{t("המשרות ש־CARVIO מחפש בשבילך", "Your CARVIO job alerts")}</h2>
    <p role="status" className="my-3">{!ready?(message?t("מצב ההתראות אינו זמין כרגע. רעננו כדי לנסות שוב.","Alert status is unavailable. Refresh to try again."):t("טוען את מצב ההתראות…","Loading alert status…")):!userId.current?t("התחברו כדי לנהל את ההתראות האישיות שלכם.","Sign in to manage your personal alerts."):active?(runtimeEnabled?t("CARVIO מחפש עבורך משרות לפי ההעדפות ששמרת.","CARVIO is searching for jobs using your saved preferences."):t("ההעדפות שמורות. החיפוש והשליחה האוטומטיים עדיין לא הופעלו עבור החשבון שלך.","Your preferences are saved. Automatic search and sending are not enabled for your account yet.")):hasPreferences?t("ההתראות כבויות. ההעדפות נשמרו ואפשר להפעיל מחדש.","Alerts are off. Your preferences are retained so you can resume anytime."):t("עדיין לא הפעלת התראות משרות.","You have not enabled job alerts yet.")}</p>
    {ready&&hasPreferences&&!editing&&<p className="mb-3 break-words"><bdi>{draft.role}</bdi> · <bdi>{draft.city||draft.country}</bdi> · {frequency===2?t("פעמיים בשבוע","Twice a week"):t("3 פעמים בשבוע","3 times a week")}</p>}
    {offer && !editing ? <><h2 className="text-xl font-bold">{t("אנחנו נמשיך לחפש בשבילך!", "We’ll keep searching for you!")}</h2><p className="my-3">{t("רוצה ש־CARVIO ישלח לך למייל משרות חדשות שמתאימות לחיפוש שלך, 2–3 פעמים בשבוע?", "Want CARVIO to email you new jobs matching your search, 2–3 times a week?")}</p><div className="flex flex-wrap gap-3"><button className={`${button} bg-teal-700 text-white`} onClick={() => setEditing(true)}>{t("כן, חפשו בשבילי!", "Yes, search for me!")}</button><button className={button} onClick={() => setOffer(false)}>{t("אולי בהמשך", "Maybe later")}</button></div></> : !editing && <button className={button} disabled={!ready} onClick={() => { if (!hasPreferences) setDraft(preferences(profile)); setEditing(true); }}>{t("Job Radar · ניהול התראות משרות", "Job Radar · Manage job alerts")}</button>}
    {!editing&&active&&<button className={`${button} mt-3 sm:ms-3`} disabled={busy} onClick={()=>void save(false)}>{t("השהיה / הפסקת התראות","Pause / stop alerts")}</button>}
    {editing && <form className="grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); void save(true); }}>
      <h2 className="text-xl font-bold">{t("משרות שמתאימות לך", "Jobs that fit you")}</h2>
      <p>{t("אפשר לעדכן את החיפוש ואת התדירות בכל עת. השהיה או הפסקה שומרות את ההעדפות, וחוסמות התראות עד להפעלה מחדש.", "Update your search and frequency anytime. Pausing or stopping retains your preferences and blocks alerts until you enable them again.")}</p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">{([["role", t("תפקיד", "Role")], ["country", t("מדינה", "Country")], ["city", t("עיר", "City")], ["workModel", t("מודל עבודה", "Work model")], ["seniority", t("דרגה", "Seniority")], ["employmentType", t("סוג משרה", "Employment type")]] as [keyof Preferences, string][]).map(([key, label]) => <label key={key} className="grid min-w-0 gap-1">{label}<input className="min-h-11 w-full min-w-0 rounded-lg border border-teal-700 bg-white px-3 text-[#134e4a]" required={key === "role" || key === "country"} maxLength={120} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></label>)}</div>
      <label className="grid gap-1">{t("כמה פעמים בשבוע?", "How often?")}<select className="min-h-11 rounded-lg border border-teal-700 bg-white p-2 text-[#134e4a]" value={frequency} onChange={e => setFrequency(Number(e.target.value))}><option value={2}>{t("פעמיים בשבוע", "Twice a week")}</option><option value={3}>{t("3 פעמים בשבוע", "3 times a week")}</option></select></label>
      <p>{t("בלחיצה על הפעלה ושמירה אני מסכים/ה לקבל למייל החשבון משרות בהתאם להעדפות ולתדירות שבחרתי.", "By choosing Enable and save, I agree to receive jobs at my account email according to my preferences and frequency.")}</p>
      {!userId.current && <a className="underline" href={`/?workspace=1&findLang=${language}`}>{t("כניסה לסביבת העבודה להתחברות", "Open workspace to sign in")}</a>}
      <div className="flex flex-wrap gap-3"><button disabled={busy} className={`${button} bg-teal-700 text-white`} type="submit">{t("הפעלה ושמירה", "Enable and save")}</button>{active && <button disabled={busy} className={button} type="button" onClick={() => void save(false)}>{t("השהיה / הפסקת התראות", "Pause / stop alerts")}</button>}<button disabled={busy} className={button} type="button" onClick={() => { if(saved.current){setDraft(saved.current.draft);setFrequency(saved.current.frequency);}setEditing(false); setOffer(false); }}>{t("סגירה", "Close")}</button></div>
    </form>}
    {ready&&userId.current&&<div className="mt-5 border-t border-teal-200 pt-4"><h3 className="text-lg font-bold">{t("המשרות האחרונות שנשלחו אליך","Recently sent to you")}</h3>
      {historyError?<p role="status">{t("לא ניתן לטעון את המשרות כרגע. רעננו כדי לנסות שוב.","Unable to load recent jobs. Refresh to try again.")}</p>:recent.length===0?<p className="mt-2">{t("עדיין לא נשלחו אליך משרות. כשיישלחו, הן יופיעו כאן.","No jobs have been sent to you yet. They will appear here after sending.")}</p>:<ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">{recent.map(job=><li className="min-w-0 rounded-xl border border-teal-200 bg-white p-4" key={job.id}><h4 className="break-words font-bold"><bdi>{job.title}</bdi></h4><p className="break-words"><bdi>{job.company}</bdi> · <bdi>{job.location}</bdi></p><p className="my-2 text-sm">{t("נשלחה ב־","Sent on ")}{new Intl.DateTimeFormat(he?'he-IL':'en-GB',{timeZone:'Asia/Jerusalem',dateStyle:'medium'}).format(new Date(job.sent_at))}</p>
       {radarJobAvailable(job)?<div className="flex flex-wrap gap-3"><a className="underline" href={`/radar/jobs/${job.id}?lang=${language}`}>{t("פרטי המשרה","Job details")}</a>{onSelectJob?<button className={`${button} w-full`} type="button" onClick={()=>onSelectJob(job)}>{t("שמירה או ניהול מועמדות","Save or manage application")}</button>:<a className="underline" href={`/?workspace=1&findLang=${language}`}>{t("לסביבת העבודה לשמירה ולניהול","Open workspace to save and manage")}</a>}</div>:<div><p>{t("המשרה כבר אינה זמינה לשמירה חדשה. מועמדות ששמרת נשארת במעקב.","This job is no longer available to save. Previously saved applications remain in your tracker.")}</p>{onSelectJob&&<button type="button" className={`${button} mt-3 w-full`} onClick={()=>onSelectJob(job)}>{t("ניהול מועמדות קיימת","Manage existing application")}</button>}</div>}</li>)}</ul>}
    </div>}
    {message && <p role="status" className="mt-3 break-words">{message}</p>}
  </section>;
}
