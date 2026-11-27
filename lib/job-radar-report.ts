// Trusted server-side events only. Public report output contains no identities or tokens.
export type RadarEvent={digestId:string;event:'sent'|'failed'|'unknown'|'dry_run_ready'|'clicked'|'returned'|'saved'|'applied'|'unsubscribed';actorKey?:string;at:string;mode?:'dry-run'|'live'};
export function radarLocalDay(now:Date){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
export function radarDayBounds(day:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw Error('Invalid Israel day');
 const midnight=(date:string)=>{
  const target=Date.parse(date);let time=target;
  for(let i=0;i<4;i++){
   const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time)).map(p=>[p.type,p.value]));
   const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);const delta=target-local;time+=delta;if(!delta)break;
  }return time;
 };
 return {start:midnight(day),end:midnight(new Date(Date.parse(day)+86400000).toISOString().slice(0,10))};
}
export function radarDailyReport(events:readonly RadarEvent[],day:string,options:{asOf?:Date;windowDays?:number}={}){
 const {start,end}=radarDayBounds(day);const asOf=(options.asOf||new Date()).getTime();const windowDays=options.windowDays??7;
 if(!Number.isFinite(asOf)||!Number.isInteger(windowDays)||windowDays<1||windowDays>30)throw Error('Invalid report window');
 const unsubscribed=new Set<string>();const returningUsers=new Set<string>();
 for(const e of events){const at=Date.parse(e.at);if(e.event==='unsubscribed'&&e.actorKey&&at>=start&&at<end&&at<=asOf&&e.mode!=='dry-run')unsubscribed.add(e.actorKey);}
 const cohort=new Map<string,number>(),failed=new Set<string>(),unknown=new Set<string>(),attempts=new Set<string>(),dry=new Set<string>();
 for(const e of events){
  const at=Date.parse(e.at);if(!e.digestId||!Number.isFinite(at)||at<start||at>=end||at>asOf)continue;
  if(e.mode==='dry-run'||e.event==='dry_run_ready'){if(e.event==='dry_run_ready')dry.add(e.digestId);continue;}
  if(['sent','failed','unknown'].includes(e.event))attempts.add(e.digestId);
  if(e.event==='sent')cohort.set(e.digestId,Math.min(cohort.get(e.digestId)??at,at));
  if(e.event==='failed')failed.add(e.digestId);if(e.event==='unknown')unknown.add(e.digestId);
 }
 const stages={clicked:new Set<string>(),returned:new Set<string>(),saved:new Set<string>(),applied:new Set<string>()};
 for(const e of events){
  const sent=cohort.get(e.digestId),at=Date.parse(e.at);if(e.mode==='dry-run'||sent===undefined||!Number.isFinite(at)||at<sent||at>asOf||at>=sent+windowDays*86400000)continue;
  if(e.event==='returned'&&e.actorKey)returningUsers.add(e.actorKey);
  if(e.event in stages)stages[e.event as keyof typeof stages].add(e.digestId);
 }
 const sent=cohort.size,clicked=stages.clicked.size,returned=stages.returned.size,saved=stages.saved.size,applied=stages.applied.size;
 const ratio=(n:number,d:number)=>d?n/d:null;
 return {unsubscribedUsers:unsubscribed.size,returningUsers:returningUsers.size,day,timeZone:'Asia/Jerusalem',asOf:new Date(asOf).toISOString(),windowDays,cohortMature:asOf>=end+windowDays*86400000,attempted:attempts.size,sent,failed:failed.size,unknown:unknown.size,dryRunReady:dry.size,clicked,returned,saved,applied,deliverySuccessRate:ratio(sent,attempts.size),clickRate:ratio(clicked,sent),returnRate:ratio(returned,sent),saveRate:ratio(saved,sent),applyRate:ratio(applied,sent)};
}
