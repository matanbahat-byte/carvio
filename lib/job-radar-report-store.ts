import type {SupabaseClient} from '@supabase/supabase-js';
import {radarDailyReport,radarDayBounds,radarLocalDay,type RadarEvent} from './job-radar-report.ts';
export async function generateRadarReports(client:SupabaseClient,options:{now?:Date;persist?:boolean}={}){
 const now=options.now||new Date();const today=radarLocalDay(now);
 const days=Array.from({length:8},(_,i)=>new Date(Date.parse(today)-(i+1)*86400000).toISOString().slice(0,10));
 const earliest=new Date(radarDayBounds(days.at(-1)!).start).toISOString();
 const events:RadarEvent[]=[];
 for(let offset=0;offset<50000;offset+=500){
  const r=await client.from('job_radar_dispatches').select('id,state,mode,created_at,finished_at,sent_at').gte('created_at',earliest).lte('created_at',now.toISOString()).order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(10000));
  if(r.error||!r.data)throw Error('dispatch_report_unavailable');
  for(const d of r.data)if(['sent','failed','unknown','dry_run_ready'].includes(d.state))events.push({digestId:d.id,event:d.state,mode:d.mode,at:d.sent_at||d.finished_at||d.created_at});
  if(r.data.length<500)break;if(offset===49500)throw Error('report_capacity_exceeded');
 }
 for(let offset=0;offset<50000;offset+=500){
  const r=await client.from('job_radar_action_events').select('dispatch_id,event,occurred_at,listing_id').gte('occurred_at',earliest).lte('occurred_at',now.toISOString()).order('dispatch_id').order('listing_id').order('event').range(offset,offset+499).abortSignal(AbortSignal.timeout(10000));
  if(r.error||!r.data)throw Error('action_report_unavailable');
  for(const e of r.data)events.push({digestId:e.dispatch_id,event:e.event,at:e.occurred_at,mode:'live'});
  if(r.data.length<500)break;if(offset===49500)throw Error('report_capacity_exceeded');
 }
 const reports=days.map(day=>radarDailyReport(events,day,{asOf:now}));
 if(options.persist){const r=await client.from('job_radar_daily_reports').upsert(reports.map(summary=>({day:summary.day,generated_at:now.toISOString(),summary})),{onConflict:'day'}).abortSignal(AbortSignal.timeout(10000));if(r.error)throw Error('report_persistence_failed');}
 return reports;
}
