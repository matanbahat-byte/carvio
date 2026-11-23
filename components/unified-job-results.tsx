"use client";
import { useEffect, useRef, useState } from "react";
import type { SearchProfile } from "@/lib/job-search";
import { jobMatchExplanation, postedAgeDays, type JobResult, type JobResultsResponse } from "@/lib/job-results";
import { demoJobResults } from "@/lib/job-results-demo";
import { JobResultCards } from "@/components/job-result-cards";

export function UnifiedJobResults({ profile, language, savedUrls, demoMode, onReview }: { profile: SearchProfile; language: "he" | "en"; savedUrls: string[]; demoMode: boolean; onReview: (job: JobResult) => void }) {
  const he = language === "he";
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<{ key: string; response: JobResultsResponse } | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const key = JSON.stringify([profile, language, demoMode]);
  const response = state?.key === key ? state.response : null;
  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    fetch("/api/job-search", { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(value => { if (!controller.signal.aborted) setAvailable(value?.available === true); }).catch(() => {});
    return () => controller.abort();
  }, [demoMode]);
  useEffect(() => () => activeRequest.current?.abort(), [key]);
  if (!available && !demoMode) return null;
  const sourceNames = [...new Set((response?.jobs || []).flatMap(job => job.sources.map(s => s.name)))].sort();
  const selectedSource = sourceNames.includes(source) ? source : "";
  const maxAge = ({ "Past 24 hours": 1, "Past week": 7, "Past month": 31 } as Record<string, number>)[profile.datePosted];
  const jobs = (response?.jobs || []).filter(job => !selectedSource || job.sources.some(s => s.name === selectedSource))
    .filter(job => { const age = postedAgeDays(job.postedAt); return !maxAge || age === null || age <= maxAge; })
    .sort((a, b) => jobMatchExplanation(b, profile).order - jobMatchExplanation(a, profile).order);
  async function loadJobs() {
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setBusy(true);
    setSource("");
    try {
      const value: JobResultsResponse = demoMode ? { status: "ready", jobs: demoJobResults } : await fetch("/api/job-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, language }), signal: controller.signal }).then(r => r.json());
      if (!controller.signal.aborted) setState({ key, response: value });
    } catch { if (!controller.signal.aborted) setState({ key, response: { status: "unavailable", jobs: [] } }); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="unified-job-results" aria-label={he ? "משרות בתוך CARVIO" : "Jobs inside CARVIO"} aria-busy={busy}>
    <header><h3>{he ? "הזדמנויות במקום אחד" : "Opportunities in one place"}</h3><p>{he ? "מודעות ממספר אתרים עם קישורי המקור שלהן. הכיסוי חלקי, וייתכן שלא יופיעו מודעות מ־LinkedIn בכל חיפוש." : "Listings from multiple websites with their original links. Coverage is partial; LinkedIn listings may not appear in every search."}</p></header>
    {demoMode && <p className="job-result-demo" role="note">{he ? "הדגמה בלבד: כל המשרות כאן פיקטיביות ואינן תוצאות חיפוש חיות." : "Demo only: every job shown here is fictional, not a live search result."}</p>}
    <button className="primary-button" type="button" disabled={busy} onClick={() => void loadJobs()}>{busy ? (he ? "מחפשים משרות…" : "Searching for jobs…") : demoMode ? (he ? "הצגת דוגמה פיקטיבית" : "Show fictional example") : (he ? "הצגת משרות כאן" : "Show jobs here")}</button>
    {response?.status === "ready" && <>
      <p className="job-results-disclosure">{he ? "הדירוג מבוסס על טייטל, מילות מפתח ומיקום בטקסט. מסנני דרגה, תחום, סוג העסקה ורדיוס אינם מובטחים. תאריכים שאינם ניתנים לפענוח נשארים לבדיקה; יש לאמת שהמשרה עדיין פתוחה." : "Ranking uses title, keywords and location in the text. Seniority, industry, employment and radius filters are not guaranteed. Unrecognized dates remain for review; verify that each job is still open."}</p>
      {response.fetchedAt && <p>{he ? "נתונים התקבלו: " : "Results retrieved: "}{new Date(response.fetchedAt).toLocaleString(he ? "he-IL" : "en-GB")}</p>}
      <label>{he ? "מקור שמופיע בתוצאות" : "Source present in results"}<select className="form-control" value={selectedSource} onChange={event => setSource(event.target.value)}><option value="">{he ? "כל המקורות" : "All sources"}</option>{sourceNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <p role="status">{he ? `${jobs.length} משרות מוצגות` : `${jobs.length} jobs shown`}</p>
      {!jobs.length && <p>{he ? "לא נמצאו משרות להצגה בטווח הזה. אפשר לשנות מקור או טווח זמן, או להמשיך בחיפוש החיצוני למטה." : "No jobs to show in this range. Change the source or time window, or continue with external searches below."}</p>}
      <JobResultCards jobs={jobs} profile={profile} language={language} savedUrls={savedUrls} onReview={onReview} />
    </>}
    {response && response.status !== "ready" && <p role="status">{response.status === "sign-in-required" ? (he ? "יש להתחבר לחשבון כדי להציג תוצאות כאן. החיפוש באתרים למטה זמין גם ללא התחברות." : "Sign in to view results here. External searches below remain available without signing in.") : response.status === "limited" ? (he ? "החיפוש המשולב זמין כרגע לפיילוט מוגבל או שמכסת החיפוש נוצלה. אפשר להמשיך במקורות למטה." : "Integrated search is currently a limited pilot, or the search allowance has been reached. Continue with the sources below.") : (he ? "לא הצלחנו לקבל תוצאות כרגע. אפשר להמשיך בחיפוש באתרים למטה." : "Results are unavailable right now. Continue with the external sources below.")}</p>}
  </section>;
}
