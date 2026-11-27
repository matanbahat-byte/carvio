import Link from 'next/link';
import {createServerSupabaseClient, isServerSupabaseConfigured} from '@/lib/supabase/server';
import {validRadarListing, validRadarListingId, type RadarListing, radarPreferencesPath} from '@/lib/job-radar-email';
export const dynamic = 'force-dynamic';
export const metadata = {robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function RadarJob({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{lang?:string}>}) {
  const {id}=await params;
  const language=(await searchParams).lang==='en'?'en':'he';
  const he=language==='he';
  const t=(a:string,b:string)=>he?a:b;
  let job:RadarListing|null=null;
  if(validRadarListingId(id)&&isServerSupabaseConfigured()) {
    try {
      const client=await createServerSupabaseClient();
      const {data,error}=await client.from('job_radar_listings').select('id,source_id,title,company,location,source_url,provider,posted_at,expires_at,is_active').eq('id',id).eq('is_active',true).gt('expires_at',new Date().toISOString()).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
      if(!error&&data&&validRadarListing(data)) job=data;
    } catch { /* Unavailable source or storage must not produce invented job details. */ }
  }
  return <main lang={language} dir={he?'rtl':'ltr'} className="min-h-screen bg-[#f0faf7] px-4 py-12 text-[#134e4a]">
    <article className="mx-auto max-w-2xl rounded-2xl border border-teal-200 bg-white p-6 sm:p-10">
      <p className="mb-6 font-bold tracking-widest text-teal-700">CARVIO · Job Radar</p>
      {job?<><h1 className="break-words text-3xl font-bold">{job.title}</h1><p className="mt-4 break-words text-xl"><bdi>{job.company}</bdi></p><p className="mt-2 break-words"><bdi>{job.location}</bdi></p><p className="mt-6 text-sm leading-7">{t('אלה פרטי המשרה שנבחרה לחיפוש שלך. בדקו את הפרטים המלאים ואת הזמינות באתר המקור.','These are the details of the job selected for your search. Check the full details and availability on the source site.')}</p><a className="mt-6 inline-block rounded-xl bg-teal-700 px-5 py-3 font-bold text-white" href={job.source_url} target="_blank" rel="noopener noreferrer">{t('לפרטים ולהגשת מועמדות באתר המקור','View details and apply on the source site')}</a><p className="mt-4 text-sm">{t('מקור','Source')}: {job.provider==='lever'?'Lever':'Greenhouse'}</p></>:<><h1 className="text-2xl font-bold">{t('המשרה אינה זמינה כרגע','This job is currently unavailable')}</h1><p className="mt-4 leading-7">{t('ייתכן שהפרסום הסתיים או שלא ניתן לטעון אותו. אפשר להמשיך לחיפוש ב־CARVIO.','The posting may have ended or could not be loaded. You can continue searching in CARVIO.')}</p></>}
      <nav className="mt-8 flex flex-wrap gap-5 border-t border-teal-100 pt-6"><Link className="underline" href={`/find?lang=${language}`}>{t('לחיפוש משרות','Search jobs')}</Link><Link className="underline" href={radarPreferencesPath(language)}>{t('ניהול התראות משרות','Manage job alerts')}</Link></nav>
    </article>
  </main>;
}
