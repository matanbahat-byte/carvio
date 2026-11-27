import type {PublicJob} from './free-job-sources.ts';
import type {RadarPreferences, RadarSnapshot, ApprovedRadarBoard, SentRadarJob} from './job-radar-selection.ts';
import {selectRadarJobs} from './job-radar-selection.ts';
import {radarScheduleSlot,RADAR_SENDER} from './job-radar-schedule.ts';
import {renderRadarEmail, type RadarEmailInput} from './job-radar-email.ts';
import type {RadarMessage} from './job-radar-gmail.ts';
export type DispatchMode='dry-run'|'live';
export type RadarWorkerSubscription={userId:string;enabled:boolean;consentVersion:string;updatedAt:string;preferences:RadarPreferences;frequency:number;language:'he'|'en';email:string;verified:boolean};
export type DispatchOutcome='dry_run_ready'|'sent'|'failed'|'unknown'|'skipped'|'cancelled';
export type RadarDispatchStore={
 read(userId:string,mode:DispatchMode):Promise<{subscription:RadarWorkerSubscription|null;sent:SentRadarJob[]|null}>;
 claim(userId:string,slot:string,mode:DispatchMode,version:string):Promise<string|null>;
 reserve(id:string,jobs:PublicJob[]):Promise<boolean>;
 gate(id:string,version:string):Promise<boolean>;
 finish(id:string,state:DispatchOutcome,code:string,providerId?:string):Promise<void>;
};
type Dependencies={store:RadarDispatchStore;collectFresh:()=>Promise<{snapshots:RadarSnapshot[];blockers:string[]}>;publish:(input:RadarEmailInput)=>Promise<RadarMessage|null>;transport?:{verifySender:()=>Promise<string>;send:(to:string,message:RadarMessage,id:string)=>Promise<string>};approvedBoards?:readonly ApprovedRadarBoard[];now?:()=>Date;liveEnabled?:boolean};
export async function runRadarDispatch(userId:string,deps:Dependencies,mode:DispatchMode='dry-run') {
  if(!['dry-run','live'].includes(mode))return {status:'blocked',code:'invalid_mode'};
  if(mode==='live'&&!deps.liveEnabled)return {status:'blocked',code:'live_disabled'};
  const now=()=>deps.now?.()||new Date();
  let dispatchId:string|null=null;
  let sendStarted=false;
  let providerId:string|undefined;
  try {
    const initial=await deps.store.read(userId,mode);
    const s=initial.subscription;
    if(!s?.enabled||s.consentVersion!=='job-radar-v1'||!s.verified)return {status:'skipped',code:'consent_or_verified_account_required'};
    const slot=radarScheduleSlot(now(),s.frequency);
    if(!slot)return {status:'skipped',code:'outside_schedule'};
    dispatchId=await deps.store.claim(userId,slot,mode,s.updatedAt);
    if(!dispatchId)return {status:'skipped',code:'duplicate_or_revoked'};
    const selection=(snapshots:RadarSnapshot[],sent:SentRadarJob[]|null)=>selectRadarJobs({subscription:{enabled:s.enabled,consentVersion:s.consentVersion,preferences:s.preferences},snapshots,sent,now:now(),approvedBoards:deps.approvedBoards});
    const collected=await deps.collectFresh();
    let picked=selection(collected.snapshots,initial.sent);
    if(!picked.jobs.length){const code=picked.blockers[0]||collected.blockers[0]||'no_new_jobs';await deps.store.finish(dispatchId,'skipped',code);return {status:'skipped',code};}
    // Fresh API-only snapshot revalidation. Do not call the existing HTML fallback.
    const fresh=await deps.collectFresh();
    const allowed=new Set(picked.jobs.map(j=>j.id));
    const selected=selection(fresh.snapshots,initial.sent);
    picked={...selected,jobs:selected.jobs.filter(j=>allowed.has(j.id))};
    if(!picked.jobs.length){await deps.store.finish(dispatchId,'skipped','no_active_relevant_jobs');return {status:'skipped',code:'no_active_relevant_jobs'};}
    if(!await deps.store.reserve(dispatchId,picked.jobs))return {status:'skipped',code:'duplicate_or_revoked'};
    const input={jobs:picked.jobs,language:s.language,dispatchId};
    // Dry run never writes public catalog rows or invokes Gmail (including OAuth).
    const message=mode==='dry-run'?renderRadarEmail(input):await deps.publish(input);
    if(!message)throw new Error('empty_message');
    if(mode==='live') {
      if(!deps.transport||await deps.transport.verifySender()!==RADAR_SENDER)throw new Error('wrong_sender');
    }
    // Re-read verified email, consent and history immediately before the durable send gate.
    const latest=await deps.store.read(userId,mode);
    const current=latest.subscription;
    const same=current?.enabled&&current.verified&&current.consentVersion===s.consentVersion&&current.updatedAt===s.updatedAt&&current.email===s.email&&radarScheduleSlot(now(),current.frequency)===slot;
    // The store's history includes this dispatch's reservations: the atomic gate
    // checks real deliveries and consent under a database row lock.
    const freshEnough=fresh.snapshots.length>0&&fresh.snapshots.every(snapshot=>{const age=now().getTime()-Date.parse(snapshot.fetchedAt);return Number.isFinite(age)&&age>=0&&age<=60000;});
    if(!same||!freshEnough||!await deps.store.gate(dispatchId,s.updatedAt)){
      await deps.store.finish(dispatchId,'cancelled','preferences_changed');return {status:'cancelled',code:'preferences_changed'};
    }
    if(mode==='dry-run'){
      await deps.store.finish(dispatchId,'dry_run_ready','simulated_success');return {status:'dry_run_ready',jobs:picked.jobs.length};
    }
    sendStarted=true;
    providerId=await deps.transport!.send(current!.email,message,dispatchId);
    await deps.store.finish(dispatchId,'sent','gmail_accepted',providerId);
    return {status:'sent',jobs:picked.jobs.length};
  } catch(error) {
    const allowedErrors=new Set(['wrong_sender','gmail_oauth_missing','gmail_oauth_failed','gmail_identity_unavailable','empty_message','dispatch_database_unavailable','preferences_unavailable','account_unavailable']);
    const code=sendStarted?'delivery_requires_reconciliation':error instanceof Error&&allowedErrors.has(error.message)?error.message:'preparation_failed';
    // Provider acceptance followed by DB failure is also uncertain. Never resend.
    if(dispatchId){try{await deps.store.finish(dispatchId,sendStarted?'unknown':'failed',code,providerId);}catch{/* Existing claim/reservations remain; future runs cannot resend it. */}}
    return {status:sendStarted?'unknown':'failed',code};
  }
}
