import {createServerSupabaseClient} from '@/lib/supabase/server';
import {radarAdminWindow} from '@/lib/job-radar-admin';
import {radarSameOrigin} from '@/lib/job-radar-request';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
async function admin(){
 const client=await createServerSupabaseClient();const auth=await client.auth.getUser();
 if(auth.error||!auth.data.user?.email_confirmed_at||auth.data.user.is_anonymous)return null;
 const access=await client.rpc('radar_admin_access').abortSignal(AbortSignal.timeout(5000));return !access.error&&access.data===true?client:null;
}
export async function GET(request:Request){
 try{
  const client=await admin();if(!client)return Response.json({error:'forbidden'},{status:403,headers});
  const q=new URL(request.url).searchParams;let filter;try{filter=radarAdminWindow(q.get('day')||'',q.get('period')||'day',q.get('cohort')||'pilot');}catch{return Response.json({error:'invalid_filter'},{status:400,headers});}
  const result=await client.rpc('radar_admin_summary',{p_start:filter.start,p_days:filter.days,p_cohort:filter.cohort}).abortSignal(AbortSignal.timeout(10000));
  if(result.error)throw Error('report_unavailable');return Response.json(result.data,{headers});
 }catch{return Response.json({error:'report_unavailable'},{status:503,headers});}
}
export async function POST(request:Request){
 try{
  if(!radarSameOrigin(request.url,request.headers.get('origin'),request.headers.get('host'),{site:request.headers.get('sec-fetch-site'),referer:request.headers.get('referer')}))return Response.json({error:'forbidden'},{status:403,headers});
  const client=await admin();if(!client)return Response.json({error:'forbidden'},{status:403,headers});
  // No enable action exists on this endpoint. POST can only stop.
  const result=await client.rpc('radar_admin_stop').abortSignal(AbortSignal.timeout(10000));if(result.error||result.data!==true)throw Error('stop_unconfirmed');
  return Response.json({stopped:true},{headers});
 }catch{return Response.json({error:'stop_unconfirmed'},{status:503,headers});}
}
