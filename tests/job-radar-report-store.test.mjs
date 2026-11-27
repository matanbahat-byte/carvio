import test from 'node:test';import assert from 'node:assert/strict';
import {generateRadarReports} from '../lib/job-radar-report-store.ts';
function fixture(failed=false){
 let writes=[];
 const data={job_radar_dispatches:[{id:'fixture-a',state:'sent',mode:'live',created_at:'2026-11-27T07:00:00Z',sent_at:'2026-11-27T07:00:00Z'},{id:'fixture-dry',state:'dry_run_ready',mode:'dry-run',created_at:'2026-11-27T07:00:00Z',finished_at:'2026-11-27T07:01:00Z'}],job_radar_action_events:[{dispatch_id:'fixture-a',listing_id:'fixture-listing',event:'saved',occurred_at:'2026-11-28T08:00:00Z'}]};
 const client={from(table){const q={select(){return q;},gte(){return q;},lte(){return q;},order(){return q;},range(){return q;},upsert(rows){writes=rows;return q;},async abortSignal(){return {data:data[table]||[],error:failed?{message:'unavailable'}:null};}};return q;}};
 return {client,writes:()=>writes};
}
test('daily runner backfills eight completed Israel cohorts, updates late conversions and only persists aggregate JSON',async()=>{
 const f=fixture();const rows=await generateRadarReports(f.client,{now:new Date('2026-11-29T08:00:00Z'),persist:true});assert.equal(rows.length,8);
 const r=rows.find(r=>r.day==='2026-11-27');assert.equal(r.sent,1);assert.equal(r.saved,1);assert.equal(r.dryRunReady,1);assert.equal(r.saveRate,1);
 assert.equal(f.writes().length,8);assert.ok(!JSON.stringify(f.writes()).includes('fixture-a'));
});
test('failed data fetch never writes a misleading zero report; dry-run performs no writes',async()=>{
 const bad=fixture(true);await assert.rejects(generateRadarReports(bad.client,{persist:true}),/unavailable/);assert.equal(bad.writes().length,0);
 const f=fixture();await generateRadarReports(f.client,{now:new Date('2026-11-29')});assert.equal(f.writes().length,0);
});
