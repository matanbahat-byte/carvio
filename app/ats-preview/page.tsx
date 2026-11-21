import { notFound } from "next/navigation";
import { ArrowUpLeft, BriefcaseBusiness, MapPin, Search, Sparkles, ExternalLink, CheckCircle2 } from "lucide-react";
import { createCachedBoardFetcher } from "@/lib/free-job-board-cache";
import { dedupePublicJobs } from "@/lib/free-job-sources";
import { emptySearchProfile, jobSearchSources, suggestedRoleAlternatives } from "@/lib/job-search";
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
  const countryWideJobs = city && jobs.length === 0 ? searchPreviewJobs(allJobs, { query: q, country, age }) : [];
  const broaderRoleJobs = q && jobs.length === 0 ? searchPreviewJobs(allJobs, { country, city, age }) : [];
  const searchCountry = /^(ישראל|israel)$/i.test(country) ? "Israel" : /^(גרמניה|germany)$/i.test(country) ? "Germany" : /^(הולנד|netherlands)$/i.test(country) ? "Netherlands" : country;
  const roleAlternatives = q ? suggestedRoleAlternatives(q).slice(0, 3) : [];
  const searchRoutes = q ? jobSearchSources({ ...emptySearchProfile, role: q, alternativeRoles: roleAlternatives.join(", "), country: searchCountry, location: city || location, datePosted: "Any time", employmentType: "" }, "he") : [];
  const prioritizedRoutes = [...searchRoutes].sort((a, b) => ({ linkedin: 0, indeed: 1, google: 2 }[a.id] - { linkedin: 0, indeed: 1, google: 2 }[b.id]));
  const broadRoutes = q ? jobSearchSources({ ...emptySearchProfile, role: q, country: searchCountry, location: city || location, datePosted: "Any time", employmentType: "" }, "he") : [];
  return (
    <main lang="he" dir="rtl" className="ats-pilot-light min-h-screen bg-[#f7f8ff] text-[#18223c]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[550px] overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 -right-32 h-[500px] w-[500px] rounded-full bg-[#dcd6ff] opacity-70 blur-[110px]" />
        <div className="absolute top-16 -left-28 h-[400px] w-[400px] rounded-full bg-[#c5f2ed] opacity-60 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5" dir="ltr">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6248ed] text-white shadow-lg shadow-violet-200"><Sparkles size={21} /></span>
            <span className="text-xl font-black tracking-tight">CARVIO<span className="text-[#735bf2]">.</span></span>
          </div>
          <span className="rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#6550bd]">✦ סביבת ניסוי</span>
        </header>

        <section className="mx-auto max-w-3xl pb-8 pt-14 text-center sm:pt-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e4dfff] bg-white/80 px-4 py-2 text-xs font-bold text-[#6851d8] shadow-sm">
            <Sparkles size={15} /> פחות חיפושים. יותר הזדמנויות.
          </div>
          <h1 className="text-4xl font-black leading-[1.2] tracking-tight sm:text-6xl">המשרה הבאה שלך <span className="bg-gradient-to-l from-[#6248ed] to-[#16b6a8] bg-clip-text text-transparent">מתחילה כאן.</span></h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#68738c] sm:text-lg">תפקיד, מדינה, ואולי גם עיר. זה כל מה שצריך כדי לגלות משרות ממעסיקים אמיתיים.</p>
        </section>

        <section aria-label="חיפוש משרות" className="mx-auto max-w-5xl rounded-[28px] border border-white bg-white/95 p-4 shadow-[0_22px_70px_rgba(74,60,142,0.12)] sm:p-6">
          <form method="get" className="grid items-end gap-3 md:grid-cols-[1.35fr_1fr_1fr_auto]">
            <label className="grid gap-2 text-sm font-bold text-[#293451]">איזו משרה מחפשים?
              <span className="relative block"><BriefcaseBusiness aria-hidden="true" size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938db2]" /><input name="q" defaultValue={q} placeholder="למשל: מהנדס תוכנה" maxLength={80} className="w-full rounded-2xl border border-[#e6e8f3] bg-[#fafaff] py-3.5 pl-3 pr-11 font-normal outline-none transition focus:border-[#806af2] focus:bg-white focus:ring-4 focus:ring-violet-100" /></span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#293451]">מדינה
              <span className="relative block"><MapPin aria-hidden="true" size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938db2]" /><input name="country" defaultValue={country || (location.toLowerCase()==="israel" ? location : "")} placeholder="למשל: ישראל" maxLength={80} className="w-full rounded-2xl border border-[#e6e8f3] bg-[#fafaff] py-3.5 pl-3 pr-11 font-normal outline-none transition focus:border-[#806af2] focus:bg-white focus:ring-4 focus:ring-violet-100" /></span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#293451]">עיר <span className="font-normal text-[#8b94a9]">(לא חובה)</span>
              <span className="relative block"><MapPin aria-hidden="true" size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938db2]" /><input name="city" defaultValue={city || (location && location.toLowerCase()!=="israel" ? location : "")} placeholder="למשל: תל אביב" maxLength={80} className="w-full rounded-2xl border border-[#e6e8f3] bg-[#fafaff] py-3.5 pl-3 pr-11 font-normal outline-none transition focus:border-[#806af2] focus:bg-white focus:ring-4 focus:ring-violet-100" /></span>
            </label>
            <input type="hidden" name="age" value="180" />
            <button type="submit" className="flex min-h-[51px] items-center justify-center gap-2 rounded-2xl bg-[#6248ed] px-6 py-3.5 font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5239d6] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-300"><Search size={19} /> חיפוש משרות</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f0f0f8] pt-4 text-xs text-[#76819a]"><CheckCircle2 size={15} className="text-[#16aa99]" /> ללא הרשמה כדי לחפש <span className="text-[#d1d4e1]">•</span> קישורים ישירים למשרות <span className="text-[#d1d4e1]">•</span> חיפוש בעברית ובאנגלית</div>
        </section>

        {hasSearch && q && <section aria-label="חיפוש במקורות נוספים" className="mx-auto mt-8 max-w-5xl rounded-[24px] border border-[#dedcf5] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-3 flex items-center gap-2"><Search size={19} className="text-[#6248ed]" /><h2 className="text-lg font-extrabold">חיפוש ראשי — LinkedIn, אחריו Indeed ו־Google</h2></div>
          <p className="text-sm leading-7 text-[#65708a]">LinkedIn הוא נקודת הפתיחה הראשית לחיפוש. אחריו Indeed ו־Google, ובהמשך מוצגות משרות ישירות מאתרי חברות. הקישורים פותחים את החיפוש באתרים עצמם עם התפקיד והמיקום שבחרת. אלה <strong>קישורי חיפוש, לא משרות שנמצאו או אומתו ב־CARVIO.</strong></p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{prioritizedRoutes.map(route => <a key={route.id} href={route.url} target="_blank" rel="noopener noreferrer" className={route.id === "linkedin" ? "flex min-h-14 items-center justify-between gap-2 rounded-2xl border-2 border-[#6248ed] bg-[#6248ed] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#5035d6]" : "flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-[#e4e1f6] bg-[#faf9ff] px-4 py-3 text-sm font-bold text-[#6048d8] transition hover:border-[#b9adff] hover:bg-[#f1edff]"}><span>{route.id === "linkedin" ? "LinkedIn · חיפוש ראשי" : route.name}</span><ExternalLink size={17} aria-hidden="true" /></a>)}</div>
          <p className="mt-4 text-xs leading-6 text-[#75809a]">מעט תוצאות? אפשר לנסות גם חיפוש בשם התפקיד המדויק בלבד, ללא הרחבת שמות תפקידים:</p>
          <div className="mt-2 flex flex-wrap gap-3">{broadRoutes.map(route => <a key={"broad-"+route.id} href={route.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-[#e4e1f6] px-4 py-2 text-sm font-semibold text-[#6048d8]">{route.id === "linkedin" ? "LinkedIn" : route.id === "indeed" ? "Indeed" : "Google"} — שם תפקיד מדויק</a>)}</div>
          {roleAlternatives.length > 0 && <p className="mt-4 text-xs leading-6 text-[#75809a]">תפקידים קרובים שכדאי לנסות בנפרד: {roleAlternatives.join(" · ")}</p>}
        </section>}
        <section className="mx-auto mt-12 max-w-5xl" aria-label="תוצאות החיפוש">
          {hasSearch ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div><p className="mb-1 text-sm font-bold text-[#745be6]">ההזדמנות הבאה שלך</p><h2 className="text-2xl font-black sm:text-3xl">{availableSources ? jobs.length + " משרות בחמשת אתרי המעסיקים" : "חמשת אתרי המעסיקים לא זמינים כרגע"}</h2><p className="mt-2 text-sm text-[#7a849b]" role="status">החיפוש שלך: {[q,country || location,city].filter(Boolean).join(" · ")} {availableSources > 0 && " · " + availableSources + "/" + boards.length + " מקורות זמינים"}</p></div>
                <span className="rounded-full border border-[#d5efe8] bg-[#e9fbf5] px-3 py-2 text-xs font-bold text-[#128879]">{availableSources ? allJobs.length + " משרות נסרקו" : "נסו שוב בעוד רגע"}</span>
              </div>
              {availableSources < boards.length && <p role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">כיסוי חלקי: {boards.length - availableSources} מקורות לא הגיבו. ייתכן שחסרות משרות.</p>}
              <div className="grid gap-4 md:grid-cols-2">
                {jobs.map(job => <article key={job.id} className="group flex flex-col rounded-[22px] border border-[#e9eaf4] bg-white p-5 shadow-[0_8px_28px_rgba(44,38,92,0.04)] transition duration-200 hover:-translate-y-1 hover:border-[#cbc2ff] hover:shadow-[0_16px_40px_rgba(76,60,147,0.12)] sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3"><span className="rounded-xl bg-[#f1edff] px-3 py-1.5 text-xs font-bold text-[#684bd5]">{q ? titleMatches(job.title, q) && !job.title.toLocaleLowerCase().includes(q.toLocaleLowerCase()) ? "תפקיד דומה" : "התאמה לתפקיד" : "משרה חדשה"}</span><span className="text-xs text-[#929ab0]">{job.postedAt ? "פורסם " + job.postedAt.slice(0,10) : "תאריך לא זמין"}</span></div>
                  <h3 dir="auto" className="text-xl font-extrabold leading-snug text-[#202b49]">{job.title}</h3>
                  <p dir="auto" className="mt-3 flex items-center gap-2 text-sm text-[#65708a]"><BriefcaseBusiness size={16} className="shrink-0 text-[#9887e9]" /> {job.company}</p>
                  <p dir="auto" className="mt-2 flex items-center gap-2 text-sm text-[#65708a]"><MapPin size={16} className="shrink-0 text-[#9887e9]" /> {job.location || "מיקום לא צוין"}</p>
                  <div className="mt-auto pt-6"><a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f1eeff] px-4 py-2.5 text-sm font-extrabold text-[#6248ed] transition group-hover:bg-[#6248ed] group-hover:text-white">לצפייה במשרה <ArrowUpLeft size={17} aria-hidden="true" /><ExternalLink size={14} aria-hidden="true" /></a></div>
                </article>)}
              </div>
              {availableSources > 0 && jobs.length === 0 && <div className="rounded-[22px] border border-[#e6e8f3] bg-white p-10 text-center"><Search className="mx-auto mb-3 text-[#9b8af3]" size={32} /><h3 className="text-xl font-bold">לא מצאנו התאמה הפעם</h3><p className="mt-2 text-sm text-[#7b849b]">הכיסוי עדיין מצומצם. נסו להסיר את העיר או להרחיב את שם התפקיד. כרגע אנחנו מחפשים רק בחמישה מעסיקים, לא בכל שוק העבודה.</p>{countryWideJobs.length > 0 && <a className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#6248ed] px-5 py-2.5 text-sm font-bold text-white" href={"?"+new URLSearchParams({q,country,age}).toString()}>הצג {countryWideJobs.length} משרות בכל המדינה</a>}{countryWideJobs.length === 0 && broaderRoleJobs.length > 0 && <p className="mt-3 text-sm text-[#65708a]">יש {broaderRoleJobs.length} משרות אחרות במיקום שבחרת, אך הן אינן תואמות לשם התפקיד.</p>}</div>}
            </>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#dcd7fb] bg-white/60 px-6 py-10 text-center"><Sparkles className="mx-auto mb-3 text-[#7e68ed]" size={28} /><h2 className="text-xl font-bold">מוכנים לגלות מה מחכה לכם?</h2><p className="mt-2 text-sm text-[#7b849b]">מזינים משרה ומדינה ולוחצים על חיפוש משרות כדי לראות תוצאות.</p></div>
          )}
        </section>
        <footer className="mx-auto mt-12 max-w-5xl border-t border-[#e7e7f3] pt-5 text-center text-xs leading-6 text-[#8991a7]">סביבת ניסוי בלבד · כיסוי המעסיקים חלקי · מקורות המשרות טרם אושרו לשימוש ציבורי · קישורי המשרות לא אומתו בנפרד · משרות עשויות להיסגר מאז פרסומן · מוצגות משרות מ־180 הימים האחרונים</footer>
      </div>
    </main>
  );}
