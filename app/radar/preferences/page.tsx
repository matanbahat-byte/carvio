import Link from 'next/link';
import {JobRadar} from '@/components/job-radar';
import {emptySearchProfile} from '@/lib/job-search';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function RadarPreferences({searchParams}:{searchParams:Promise<{lang?:string;action?:string}>}) {
  const params=await searchParams;
  const language=params.lang==='en'?'en':'he';
  const he=language==='he';
  const stop=params.action==='stop';
  return <main lang={language} dir={he?'rtl':'ltr'} className="min-h-screen bg-[#f0faf7] px-4 py-10 text-[#134e4a]">
    <div className="mx-auto max-w-5xl"><p className="mb-5 font-bold tracking-widest text-teal-700">CARVIO · Job Radar</p><h1 className="text-3xl font-bold">{stop?(he?'הפסקת התראות משרות':'Stop job alerts'):(he?'העדפות המשרות שלך':'Your job preferences')}</h1><p className="mt-4 leading-7">{stop?(he?'להפסקת התראות, התחברו לחשבון ובחרו ״הפסקת התראות״. פתיחת הקישור לבדה אינה משנה את ההעדפות.':'To stop alerts, sign in and choose “Stop alerts”. Opening this link alone does not change your preferences.'):(he?'כאן אפשר לעדכן את החיפוש ואת התדירות, או להפסיק התראות. יש להתחבר לחשבון כדי לשמור שינויים.':'Update your search and frequency, or stop alerts here. Sign in to save changes.')}</p></div>
    <JobRadar language={language} profile={emptySearchProfile} openSettings/>
    <div className="mx-auto max-w-5xl"><Link className="underline" href={`/find?lang=${language}`}>{he?'לחיפוש משרות':'Search jobs'}</Link></div>
  </main>;
}
