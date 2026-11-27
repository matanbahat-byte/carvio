import Link from 'next/link';
import { searchCompanyJobs, COMPANY_BOARDS, companySearchPath } from '@/lib/company-job-search';
export const dynamic='force-dynamic';
export const maxDuration=15;
export default async function CompanyJobs({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;const value=(key:string)=>typeof params[key]==='string'?(params[key] as string).trim().slice(0,120):'';
 const he=value('lang')!=='en';const t=(a:string,b:string)=>he?a:b;
 const p={role:value('q'),country:value('country'),location:value('city'),radius:value('radius')};
 const result=await searchCompanyJobs(p);
 return <main dir={he?'rtl':'ltr'} className="min-h-screen bg-[#f0fdfa] px-5 py-10 text-[#134e4a]"><div className="mx-auto max-w-4xl space-y-6">
 <Link href="/find" className="font-bold">CARVIO · {t('חזרה לחיפוש','Back to search')}</Link>
 <a href={companySearchPath(p,he?'he':'en')} className="inline-block rounded-xl border border-teal-300 px-4 py-2">{t('רענון התוצאות','Refresh results')}</a>
 <h1 className="text-3xl font-bold">{t('משרות מאתרי החברות','Jobs from employers')}</h1>
 <p className="text-lg">{[p.role,p.location,p.country].filter(Boolean).join(' · ')}{p.location&&p.radius?` · ${p.radius} ${t('ק״מ','km')}`:''}</p>
 <p>{t('מוצגות רק משרות שפורסמו במקור המעסיק ונמצאה להן התאמה למיקום שנבחר. נבדוק שוב בעת פתיחת המשרה.','Only postings found in the employer source and matching your selected location are shown. We check again when you open a job.')}</p>
 <p className="text-sm">{t('כיסוי ראשוני מוגבל:','Limited initial coverage:')} {COMPANY_BOARDS.map(b=>b.company).join(', ')}. {t('חיפוש הרדיוס מבוסס על מרכזי ערים נתמכות בישראל; כתובת או מיקום שלא ניתן לאמת לא יורחבו ברדיוס.','Radius matching uses supported Israeli city centres; unverified locations are not expanded by radius.')}</p>
 {!p.role||!p.country?<p role="status">{t('יש לבחור תפקיד ומדינה בחיפוש.','Choose a role and country in search.')}</p>:!result.jobs.length?<p role="status" className="rounded-2xl bg-white p-6">{!result.checkedSources?t('מקורות המעסיקים אינם זמינים כרגע. נסו שוב בהמשך.','Employer sources are currently unavailable. Try again later.'):t('לא נמצאו במקורות שנבדקו משרות זמינות עם מיקום תואם. נסו חיפוש אחר או חזרו בהמשך.','No available jobs with a matching location were found in the checked sources. Try a different search or return later.')}</p>:<ul className="grid gap-4 sm:grid-cols-2">{result.jobs.map(job=><li key={job.id} className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{job.title}</h2><p>{job.company} · {job.matchedLocation}</p><p className="my-3 text-sm">{t('נבדק במקור המעסיק:','Checked at employer source:')} {new Date(job.checkedAt).toLocaleString(he?'he-IL':'en-GB',{timeZone:'Asia/Jerusalem'})}</p><form action="/api/company-jobs/open" method="POST"><input type="hidden" name="id" value={job.id}/>{Object.entries({...p,lang:he?'he':'en'}).map(([key,v])=><input key={key} type="hidden" name={key} value={v}/>)}<button type="submit" className="rounded-xl bg-[#0f766e] px-4 py-3 font-bold text-white">{t('פתיחת המשרה באתר החברה','Open job at employer')}</button></form></li>)}</ul>}
 {!!result.unavailable&&result.checkedSources>0&&<p role="status">{t('חלק ממקורות המעסיקים לא היו זמינים. התוצאות חלקיות.','Some employer sources were unavailable. Results are partial.')}</p>}
 </div></main>;
}
