// Internal server composition. Construct once per batch, never expose as a browser endpoint.
import type {SupabaseClient} from '@supabase/supabase-js';
import {createRadarDispatchStore} from './job-radar-worker-store.ts';
import {runRadarDispatch,type DispatchMode} from './job-radar-dispatch.ts';
import {createRadarSourceCollector} from './job-radar-sources.ts';
import {APPROVED_RADAR_BOARDS,type ApprovedRadarBoard,type RadarSnapshot} from './job-radar-selection.ts';
import {prepareRadarEmail} from './job-radar-email.ts';
import {createRadarGmailTransport,type GmailCredentials} from './job-radar-gmail.ts';
export function createRadarWorker(client:SupabaseClient,options:{credentials?:GmailCredentials;approvedBoards?:readonly ApprovedRadarBoard[];request?:typeof fetch;liveEnabled?:boolean}={}) {
 let latest:{snapshots:RadarSnapshot[];blockers:string[]}|null=null;
 let collectedAt=0;let sourceCalls=0;
 const request:typeof fetch=async(input,init)=>{
  if(sourceCalls++>=20)throw new Error('source_request_budget_exhausted');
  return (options.request||fetch)(input,init);
 };
 const collectFresh=async()=>{
  if(latest&&Date.now()-collectedAt<30000)return latest;
  latest=await createRadarSourceCollector(request,options.approvedBoards||APPROVED_RADAR_BOARDS)();collectedAt=Date.now();return latest;
 };
 const deps={store:createRadarDispatchStore(client),collectFresh,publish:(input:Parameters<typeof prepareRadarEmail>[1])=>prepareRadarEmail(client,input),transport:options.credentials?createRadarGmailTransport(options.credentials,options.request):undefined,liveEnabled:options.liveEnabled===true,approvedBoards:options.approvedBoards};
 return {dispatch:(userId:string,mode:DispatchMode='dry-run')=>runRadarDispatch(userId,deps,mode)};
}
