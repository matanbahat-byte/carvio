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
  // External providers primarily index international city names in Latin script.
  const externalCityNames: Record<string, string> = { "תל אביב": "Tel Aviv", "ירושלים": "Jerusalem", "חיפה": "Haifa", "הרצליה": "Herzliya", "רמת גן": "Ramat Gan", "פתח תקווה": "Petah Tikva", "נתניה": "Netanya", "באר שבע": "Beer Sheva", "ראשון לציון": "Rishon LeZion", "רחובות": "Rehovot", "כפר סבא": "Kfar Saba" };
  const externalLocation = externalCityNames[(city || location).trim()] || city || location;
  const roleAlternatives = q ? suggestedRoleAlternatives(q).slice(0, 3) : [];
  const searchRoutes = q ? jobSearchSources({ ...emptySearchProfile, role: q, alternativeRoles: roleAlternatives.join(", "), radius: "", country: searchCountry, location: externalLocation, datePosted: "Any time", employmentType: "" }, "he") : [];
  const sourcePriority: Record<string, number> = { linkedin: 0, indeed: 1, google: 2 };
  // Keep unknown future providers after the three primary sources, without NaN comparisons.
  const prioritizedRoutes = [...searchRoutes].sort((a, b) => (sourcePriority[a.id] ?? 100) - (sourcePriority[b.id] ?? 100));
  const broadRoutes = q ? jobSearchSources({ ...emptySearchProfile, role: q, radius: "", country: searchCountry, location: externalLocation, datePosted: "Any time", employmentType: "" }, "he") : [];
  return (
    <main lang="he" dir="rtl" className="ats-pilot-light min-h-screen overflow-hidden bg-[#f4f6ff] text-[#18223c]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[660px] overflow-hidden" aria-hidden="true">
        <div className="absolute -top-56 -right-40 h-[720px] w-[720px] rounded-full bg-[#9b8aff] opacity-40 blur-[120px]" />
        <div className="absolute top-12 -left-40 h-[560px] w-[560px] rounded-full bg-[#66e8dc] opacity-35 blur-[110px]" /><div className="absolute right-[20%] top-44 h-52 w-52 rotate-12 rounded-[65px] border-[28px] border-[#c6bdff]/35" /><div className="absolute left-[12%] top-24 h-20 w-20 rotate-45 rounded-[25px] bg-[#ffdf8b]/50" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5" dir="ltr">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6248ed] text-white shadow-lg shadow-violet-200"><Sparkles size={21} /></span>
            <span className="text-xl font-black tracking-tight">CARVIO<span className="text-[#735bf2]">.</span></span>
          </div>
          <span className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-extrabold tracking-wide text-[#6550bd] shadow-sm backdrop-blur-xl">✦ CARVIO LAB / סביבת ניסוי</span>
        </header>

        <section className="relative mx-auto max-w-4xl pb-10 pt-16 text-center sm:pt-24">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d6d0ff] bg-white/75 px-5 py-2.5 text-xs font-extrabold tracking-wide text-[#6851d8] shadow-[0_8px_24px_rgba(98,72,237,0.08)] backdrop-blur-xl">
            <Sparkles size={15} /> פחות חיפושים. יותר הזדמנויות.
          </div>
          <h1 className="text-5xl font-black leading-[1.16] tracking-tight sm:text-7xl">הקריירה שלך.<br/><span className="bg-gradient-to-l from-[#6248ed] via-[#b34ce3] to-[#0db6a8] bg-clip-text text-transparent">בלי גבולות.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#68738c] sm:text-xl">הזדמנויות גדולות מתחילות בחיפוש פשוט. <strong className="text-[#3a4262]">תפקיד. מדינה. עיר.</strong> מכאן אנחנו פותחים לך דלתות.</p><div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold text-[#6257aa]"><span className="rounded-full border border-[#d9d4ff] bg-white/75 px-4 py-2">01 / מגדירים יעד</span><span className="text-[#a99fe9]">✦</span><span className="rounded-full border border-[#d9d4ff] bg-white/75 px-4 py-2">02 / מגלים הזדמנויות</span><span className="text-[#a99fe9]">✦</span><span className="rounded-full border border-[#d9d4ff] bg-white/75 px-4 py-2">03 / יוצאים לדרך</span></div>
        </section>

        <section aria-label="חיפוש משרות" className="relative mx-auto max-w-5xl rounded-[32px] border border-white/90 bg-white/90 p-4 shadow-[0_30px_90px_rgba(74,60,142,0.18)] backdrop-blur-xl sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3"><span className="text-sm font-black tracking-wide text-[#6248ed]">✳ FIND YOUR NEXT MOVE</span><span className="rounded-full bg-[#e9fbf5] px-3 py-1.5 text-xs font-bold text-[#128879]">פשוט מתחילים</span></div><form method="get" className="grid items-end gap-3 md:grid-cols-[1.35fr_1fr_1fr_auto]">
            <label className="grid gap-2 text-sm font-bold text-[#293451]">איזו משרה מחפשים?
              <span className="relative block"><BriefcaseBusiness aria-hidden="true" size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938db2]" /><input name="q" defaultValue={q} placeholder="למשל: מהנדס תוכנה" maxLength={80} className="w-full rounded-2xl border-2 border-[#e6e8f3] bg-[#fafaff] py-4 pl-3 pr-11 font-normal outline-none transition focus:border-[#806af2] focus:bg-white focus:ring-4 focus:ring-violet-100" /></span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#293451]">מדינה
              <span className="relative block"><MapPin aria-hidden="true" size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938db2]" /><input name="country" defaultValue={country || (location.toLowerCase()==="israel" ? location : "")} placeholder="למשל: ישראל" maxLength={80} className="w-full rounded-2xl border-2 border-[#e6e8f3] bg-[#fafaff] py-4 pl-3 pr-11 font-normal outline-none transition focus:border-[#806af2] focus:bg-white focus:ring-4 focus:ring-violet-100" /></span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#293451]">עיר <span className="font-normal text-[#8b94a9]">(לא חובה)</span>
              <span className="relative block"><MapPin aria-hidden="true" size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#938db2]" /><input name="city" defaultValue={city || (location && location.toLowerCase()!=="israel" ? location : "")} placeholder="למשל: תל אביב" maxLength={80} className="w-full rounded-2xl border-2 border-[#e6e8f3] bg-[#fafaff] py-4 pl-3 pr-11 font-normal outline-none transition focus:border-[#806af2] focus:bg-white focus:ring-4 focus:ring-violet-100" /></span>
            </label>
            <input type="hidden" name="age" value="180" />
            <button type="submit" className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#6248ed] to-[#a149e6] px-7 py-4 font-extrabold text-white shadow-[0_12px_28px_rgba(98,72,237,0.3)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(98,72,237,0.38)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-300"><Search size={19} /> חיפוש משרות</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f0f0f8] pt-4 text-xs text-[#76819a]"><CheckCircle2 size={15} className="text-[#16aa99]" /> ללא הרשמה כדי לחפש <span className="text-[#d1d4e1]">•</span> קישורים לאתרי המעסיקים <span className="text-[#d1d4e1]">•</span> חיפוש בעברית ובאנגלית</div>
        </section>

        {hasSearch && q && <section aria-label="חיפוש במקורות נוספים" className="mx-auto mt-9 max-w-5xl rounded-[30px] border border-[#dedcf5] bg-white/95 p-5 shadow-[0_16px_50px_rgba(74,60,142,0.08)] sm:p-7">
          <div className="mb-3 flex items-center gap-2"><Search size={19} className="text-[#6248ed]" /><h2 className="text-xl font-black">שלוש דרכים להזדמנות הבאה שלך</h2></div>
          <p className="text-sm leading-7 text-[#65708a]">LinkedIn הוא נקודת הפתיחה הראשית לחיפוש. אחריו Indeed ו־Google, ובהמשך מוצגות משרות ישירות מאתרי חברות. הקישורים פותחים את החיפוש באתרים עצמם עם התפקיד והמיקום שבחרת. אלה <strong>קישורי חיפוש, לא משרות שנמצאו או אומתו ב־CARVIO.</strong></p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{prioritizedRoutes.map(route => <a key={route.id} href={route.url} target="_blank" rel="noopener noreferrer" className={route.id === "linkedin" ? "flex min-h-[76px] items-center justify-between gap-2 rounded-[22px] border-2 border-[#6248ed] bg-gradient-to-bl from-[#6248ed] to-[#a149e6] px-5 py-4 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(98,72,237,0.22)] transition duration-200 hover:-translate-y-1 hover:shadow-xl" : "flex min-h-[76px] items-center justify-between gap-2 rounded-[22px] border border-[#e4e1f6] bg-gradient-to-bl from-white to-[#f1edff] px-5 py-4 text-base font-extrabold text-[#6048d8] transition duration-200 hover:-translate-y-1 hover:border-[#b9adff] hover:shadow-lg"}><span>{route.id === "linkedin" ? "LinkedIn · חיפוש ראשי" : route.name}</span><ExternalLink size={17} aria-hidden="true" /></a>)}</div>
          <p className="mt-4 text-xs leading-6 text-[#75809a]">מעט תוצאות? אפשר לנסות גם חיפוש בשם התפקיד המדויק בלבד, ללא הרחבת שמות תפקידים:</p>
          <div className="mt-2 flex flex-wrap gap-3">{broadRoutes.map(route => <a key={"broad-"+route.id} href={route.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-[#e4e1f6] px-4 py-2 text-sm font-semibold text-[#6048d8]">{route.id === "linkedin" ? "LinkedIn" : route.id === "indeed" ? "Indeed" : "Google"} — שם תפקיד מדויק</a>)}</div>
          {roleAlternatives.length > 0 && <p className="mt-4 text-xs leading-6 text-[#75809a]">תפקידים קרובים שכדאי לנסות בנפרד: {roleAlternatives.join(" · ")}</p>}
        </section>}
        <section className="mx-auto mt-12 max-w-5xl" aria-label="תוצאות החיפוש">
          {hasSearch ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div><p className="mb-1 text-sm font-bold text-[#745be6]">ההזדמנות הבאה שלך</p><h2 className="text-2xl font-black sm:text-3xl">{availableSources ? jobs.length + " משרות תואמות מתוך " + availableSources + " מקורות מעסיקים זמינים (מתוך " + boards.length + ")" : "חמשת מקורות המעסיקים לא זמינים כרגע"}</h2><p className="mt-2 text-sm text-[#7a849b]" role="status">החיפוש שלך: {[q,country || location,city].filter(Boolean).join(" · ")} {availableSources > 0 && " · " + availableSources + "/" + boards.length + " מקורות זמינים"}</p></div>
                <span className="rounded-full border border-[#d5efe8] bg-[#e9fbf5] px-3 py-2 text-xs font-bold text-[#128879]">{availableSources ? allJobs.length + " משרות התקבלו ממקורות ATS" : "נסו שוב בעוד רגע"}</span>
              </div>
              {availableSources < boards.length && <p role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">כיסוי חלקי: {boards.length - availableSources} מקורות לא הגיבו. ייתכן שחסרות משרות.</p>}
              <div className="grid gap-4 md:grid-cols-2">
                {jobs.map(job => <article key={job.id} className="group relative flex flex-col overflow-hidden rounded-[26px] border border-[#e9eaf4] bg-white p-5 shadow-[0_12px_32px_rgba(44,38,92,0.06)] transition duration-200 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-l before:from-[#6248ed] before:via-[#a149e6] before:to-[#16b6a8] hover:-translate-y-1 hover:border-[#cbc2ff] hover:shadow-[0_20px_48px_rgba(76,60,147,0.14)] sm:p-6">
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
