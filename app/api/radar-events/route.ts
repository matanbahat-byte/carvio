import {radarSameOrigin} from '@/lib/job-radar-request';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 try{
  if(!radarSameOrigin(request.url,request.headers.get('origin'),request.headers.get('host'),{site:request.headers.get('sec-fetch-site'),referer:request.headers.get('referer')}))return Response.json({recorded:false},{status:403,headers});
  const text=await request.text();if(text.length>1024)throw Error('Invalid input');
  const {token,event}=JSON.parse(text);
  if(typeof token!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token)||!['clicked','returned','saved','applied'].includes(event))throw Error('Invalid input');
  const client=await createServerSupabaseClient();const {data,error}=await client.auth.getUser();
  if(error||!data.user?.email_confirmed_at||data.user.is_anonymous)return Response.json({recorded:false},{status:401,headers});
  const result=await client.rpc('record_radar_action',{p_token:token,p_event:event}).abortSignal(AbortSignal.timeout(5000));
  return Response.json({recorded:!result.error&&result.data===true},{headers});
 }catch{return Response.json({recorded:false},{status:400,headers});}
}
