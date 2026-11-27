import {createServerSupabaseClient} from '@/lib/supabase/server';
import {RadarAdmin} from '@/components/job-radar-admin';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function RadarAdminPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const lang=(await searchParams).lang==='en'?'en':'he';let allowed=false;
 try{const client=await createServerSupabaseClient();const auth=await client.auth.getUser();if(auth.data.user?.email_confirmed_at&&!auth.data.user.is_anonymous){const r=await client.rpc('radar_admin_access').abortSignal(AbortSignal.timeout(5000));allowed=!r.error&&r.data===true;}}catch{/* Fail closed. */}
 if(!allowed)return <main dir={lang==='he'?'rtl':'ltr'} className="p-8"><h1>{lang==='he'?'הגישה מיועדת למנהלי מערכת מורשים בלבד.':'Access is restricted to authorized administrators.'}</h1><a href={`/?workspace=1&findLang=${lang}`}>{lang==='he'?'לסביבת העבודה להתחברות':'Open workspace to sign in'}</a></main>;
 return <RadarAdmin language={lang}/>;
}
