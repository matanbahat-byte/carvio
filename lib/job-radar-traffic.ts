// Coarse session attribution, separate from server-verified per-job conversion evidence.
// Missing tags mean organic OR unattributed; they do not prove causation.
export type RadarTrafficEvent={id:string;user_id:string|null;event_name:string;created_at:string;properties:Record<string,unknown>};
export function radarTrafficSummary(events:readonly RadarTrafficEvent[],start:number,end:number){
 const sessions=new Map<string,{user:string;radar:boolean;returned:boolean;saved:boolean;applied:boolean}>();const seen=new Set<string>();
 for(const e of events){
  const at=Date.parse(e.created_at),sid=e.properties?.sessionId;
  if(seen.has(e.id)||!e.user_id||typeof sid!=='string'||!sid.trim()||at<start||at>=end||!Number.isFinite(at))continue;
  seen.add(e.id);if(!['session_started','return_visit','radar_visit_verified','opportunity_saved','marked_applied'].includes(e.event_name))continue;
  const key=JSON.stringify([e.user_id,sid]);const s=sessions.get(key)||{user:e.user_id,radar:false,returned:false,saved:false,applied:false};
  s.radar ||= e.event_name==='radar_visit_verified';s.returned ||= e.event_name==='return_visit';s.saved ||= e.event_name==='opportunity_saved';s.applied ||= e.event_name==='marked_applied';sessions.set(key,s);
 }
 const bucket=(radar:boolean)=>{const list=[...sessions.values()].filter(s=>s.radar===radar);return {sessions:list.length,users:new Set(list.map(s=>s.user)).size,returningUsers:new Set(list.filter(s=>s.returned).map(s=>s.user)).size,savingSessions:list.filter(s=>s.saved).length,applyingSessions:list.filter(s=>s.applied).length,saveRate:list.length?list.filter(s=>s.saved).length/list.length:null,applyRate:list.length?list.filter(s=>s.applied).length/list.length:null};};
 return {available:true,model:'verified-radar-session-v1',radar:bucket(true),organicOrUnattributed:bucket(false)};
}
