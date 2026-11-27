import {savedJobListingUrl} from './job-search.ts';
export type RadarRecentJob={id:string;title:string;company:string;location:string;source_url:string;provider:'greenhouse'|'lever';is_active:boolean;expires_at:string;sent_at:string};
export function readRadarWorkspace(value:unknown):{runtimeEnabled:boolean;jobs:RadarRecentJob[]}{
 const x=value as {runtimeEnabled?:unknown;jobs?:unknown};const seen=new Set<string>();
 const jobs=Array.isArray(x?.jobs)?x.jobs.filter((j):j is RadarRecentJob=>{
  if(!j||typeof j!=='object'||!['title','company','location','source_url','expires_at','sent_at'].every(k=>typeof j[k]==='string')||!/^[a-f0-9]{64}$/.test(j.id)||seen.has(j.id)||!['greenhouse','lever'].includes(j.provider)||typeof j.is_active!=='boolean'||!Number.isFinite(Date.parse(j.sent_at))||!Number.isFinite(Date.parse(j.expires_at))||!savedJobListingUrl(j.source_url))return false;
  seen.add(j.id);return true;
 }).sort((a,b)=>Date.parse(b.sent_at)-Date.parse(a.sent_at)).slice(0,20):[];
 return {runtimeEnabled:x?.runtimeEnabled===true,jobs};
}
export const radarJobAvailable=(job:RadarRecentJob,now=Date.now())=>job.is_active&&Date.parse(job.expires_at)>now;
