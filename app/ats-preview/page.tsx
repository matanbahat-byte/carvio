import { notFound } from "next/navigation";
import { createCachedBoardFetcher } from "@/lib/free-job-board-cache";
import { dedupePublicJobs } from "@/lib/free-job-sources";
import { searchPreviewJobs, titleMatches } from "@/lib/free-job-preview-search";
import type { PublicBoard } from "@/lib/free-job-sources";

export const dynamic = "force-dynamic";
const boards: readonly PublicBoard[] = [
  { provider: "greenhouse", token: "greenhouse", company: "Greenhouse" },
  { provider: "lever", token: "walkme", company: "WalkMe" },
  { provider: "lever", token: "lendbuzz", company: "Lendbuzz" },
  { provider: "lever", token: "Zadara", company: "Zadara" },
  { provider: "lever", token: "airslate", company: "airSlate" },
];
const getJobs = createCachedBoardFetcher();
export default async function AtsPreview({ searchParams }: { searchParams: Promise<{ q?: string; location?: string; country?: string; city?: string; age?: string }> }) {
  // Never expose the pilot in production or permit user-controlled ATS endpoints.
  if (process.env.VERCEL_ENV !== "preview") notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const location = typeof params.location === "string" ? params.location.trim().slice(0, 80) : "";
  const country = typeof params.country === "string" ? params.country.trim().slice(0, 80) : "";
  const city = typeof params.city === "string" ? params.city.trim().slice(0, 80) : "";
  const age = params.age === "all" ? "all" : params.age === "90" ? "90" : "180";
  const hasSearch = Boolean(q || country || city || location);
  const results = hasSearch ? await Promise.all(boards.map(board => getJobs(board))) : [];
  const allJobs = dedupePublicJobs(results.flatMap(result => result.jobs));
  const availableSources = results.filter(result => result.status === "ok").length;
  const jobs = searchPreviewJobs(allJobs, { query: q, location, country, city, age });
  return (
    <main lang="he" dir="rtl" className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-900">
      <p className="text-sm font-semibold text-indigo-700">CARVIO · סביבת ניסוי</p>
      <h1 className="mt-2 text-3xl font-bold">מוצאים את המשרה הבאה</h1>
      <p className="mt-3 text-sm text-slate-600">חיפוש משרות ממעסיקים נבחרים. סביבת ניסוי בלבד — הכיסוי עדיין חלקי.</p>
      <form method="get" className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">איזו משרה מחפשים?
          <input name="q" defaultValue={q} placeholder="למשל: מהנדס תוכנה" maxLength={80} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">מדינה
          <input name="country" defaultValue={country || (location.toLowerCase()==="israel" ? location : "")} placeholder="למשל: ישראל" maxLength={80} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">עיר (לא חובה)
          <input name="city" defaultValue={city || (location && location.toLowerCase()!=="israel" ? location : "")} placeholder="למשל: תל אביב" maxLength={80} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" />
        </label>
        <input type="hidden" name="age" value="180" />
        <button type="submit" className="w-full rounded-lg bg-indigo-700 px-5 py-4 text-base font-semibold text-white">חיפוש משרות</button>
      </form>
      {(q || country || city || location) && <p className="mt-4 text-sm font-medium text-slate-700" role="status">החיפוש שלך: {[q,country || location,city].filter(Boolean).join(" · ")}</p>}
      <p className="mt-3 text-xs text-slate-500">ניסוי בלבד: המקורות טרם אושרו לשימוש ציבורי, והקישורים למשרות לא אומתו בנפרד. </p>
      <p className="mt-3 text-xs text-slate-500">מוצגות משרות שפורסמו ב־180 הימים האחרונים. ייתכן שמשרות נסגרו מאז הפרסום.</p>
      {!hasSearch && <p className="mt-5 text-sm text-slate-600">מזינים משרה ומיקום ולוחצים על חיפוש משרות כדי לראות תוצאות.</p>}
      {hasSearch && <p className="mt-5 text-sm text-slate-600" role="status">{availableSources ? `${jobs.length} משרות מתאימות מתוך ${allJobs.length} משרות שנאספו · ${availableSources}/${boards.length} מקורות פעילים` : "מקורות המשרות אינם זמינים כרגע. כדאי לנסות שוב."}</p>}
      {hasSearch && availableSources < boards.length && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">כיסוי חלקי: {boards.length - availableSources} מקורות לא הגיבו. ייתכן שחסרות משרות.</p>}
      <div className="mt-5 space-y-3">
        {jobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{job.company} · {job.location || "מיקום לא צוין"}</p>
          <p className="mt-2 text-xs font-medium text-indigo-700">{q ? titleMatches(job.title, q) ? job.title.toLocaleLowerCase().includes(q.toLocaleLowerCase()) ? "התאמה לשם המשרה" : "התאמה לתפקיד דומה" : "התאמה לחברה או למיקום" : "ממויין לפי תאריך פרסום"}</p>
          <p className="mt-2 text-xs text-slate-500">{job.postedAt ? `פורסם: ${job.postedAt.slice(0,10)}` : "תאריך פרסום לא זמין"}</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline">לצפייה במשרה ולהגשת מועמדות</a>
        </article>)}
      </div>
      {availableSources > 0 && jobs.length === 0 && <p className="mt-5 text-sm text-slate-600">לא נמצאו משרות מתאימות אצל המעסיקים שנבדקו. נסו שם תפקיד רחב יותר או עיר אחרת.</p>}
    </main>
  );
}
