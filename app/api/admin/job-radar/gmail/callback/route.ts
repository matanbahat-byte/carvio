import {handleRadarOAuth} from '@/lib/job-radar-oauth-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleRadarOAuth(request,'callback');}
