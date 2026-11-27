import {radarDayBounds} from './job-radar-report.ts';
export function radarAdminWindow(day:string,period:string,cohort:string){
 radarDayBounds(day);
 if(!['day','week'].includes(period)||!['pilot','test','real','unclassified'].includes(cohort))throw Error('Invalid filter');
 const days=period==='week'?7:1;
 return {start:new Date(Date.parse(day)-(days-1)*86400000).toISOString().slice(0,10),days,cohort};
}
export type RadarAdminMetrics={enabledNow:number;activatedUsers:number;selectedJobs:number|null;sent:number;failed:number;unknown:number;clicked:number;returned:number;saved:number;applied:number;unsubscribed:number;dryRunReady:number};
export type RadarAdminSummary={current:RadarAdminMetrics;previous:RadarAdminMetrics;sendingEnabled:boolean;generatedAt:string;timeZone:string};
export function radarAdminChange(current:number|null,previous:number|null){return current===null||previous===null?null:current-previous;}
