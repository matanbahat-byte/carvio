import { COMPANY_BOARDS, searchCompanyJobs, companySearchPath } from '@/lib/company-job-search';
export const maxDuration=15;
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 try{
  if(Number(request.headers.get('content-length'))>2000)return new Response('Invalid input',{status:400,headers});
  const text=await request.text();if(text.length>2000)return new Response('Invalid input',{status:400,headers});
  const data=new URLSearchParams(text);const get=(key:string)=>(data.get(key)||'').trim().slice(0,120);
  const id=get('id');const board=COMPANY_BOARDS.find(b=>id.startsWith(`${b.provider}:${b.token}:`));
  const p={role:get('role'),country:get('country'),location:get('location'),radius:get('radius')};
  if(!board||!p.role||!p.country)return new Response('Invalid input',{status:400,headers});
  const result=await searchCompanyJobs(p,fetch,new Date(),[board],id);const job=result.jobs.find(j=>j.id===id);
  // Never redirect to user input or a cached source URL. Recheck source and geography.
  if(job)return new Response(null,{status:303,headers:{...headers,Location:job.url}});
  const he=get('lang')!=='en';const back=companySearchPath(p,he?'he':'en');
  return new Response(`<!doctype html><html lang="${he?'he':'en'}" dir="${he?'rtl':'ltr'}"><meta charset="utf-8"><title>CARVIO</title><main><h1>${he?'לא ניתן לאמת שהמשרה עדיין זמינה ומתאימה למיקום':'This job could not be verified as available in your location'}</h1><p>${he?'המשרה לא תיפתח. רעננו את התוצאות.':'The job will not open. Refresh the results.'}</p><a href="${back.replaceAll('&','&amp;').replaceAll('"','&quot;')}">${he?'חזרה לתוצאות':'Back to results'}</a></main></html>`,{status:result.unavailable?503:410,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 }catch{return new Response('Unavailable',{status:503,headers});}
}
