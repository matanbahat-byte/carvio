import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRadarJobs } from '../lib/job-radar-preparation.ts';
const now=new Date('2026-11-27T09:00:00Z');
const board={provider:'greenhouse',token:'fixture',company:'Fixture'};
const approvedBoards=[{board,permissionReference:'fixture-only'}];
const saved={enabled:true,preferences:{role:'מנהלת גיוס',country:'ישראל',city:'תל אביב',seniority:''},consent_version:'job-radar-v1',updated_at:'2026-11-27T08:00:00Z'};
const job={id:1,title:'Recruitment Manager',location:{name:'Tel Aviv, Israel'},absolute_url:'https://boards.greenhouse.io/fixture/jobs/1',first_published:'2026-11-26'};
function fixture(patch={}) {
 const queries=[];let reads=0;
 const client={auth:{getUser:async()=>({data:{user:{id:'owner',email_confirmed_at:'2026-11-01',is_anonymous:false,...patch.user}},error:null})},from(table){
  const query={select(){return query;},eq(column,value){queries.push([table,column,value]);return query;},order(){return query;},range(){return query;},maybeSingle(){return query;},abortSignal(){return query;},then(resolve,reject){
   if(table==='job_radar_preferences') return Promise.resolve({data:++reads>1?(patch.current??saved):(patch.saved??saved),error:patch.preferencesError??null}).then(resolve,reject);
   return Promise.resolve({data:patch.history??[],error:patch.historyError??null,count:patch.count??(patch.history??[]).length}).then(resolve,reject);
  }};return query;
 }};
 let collections=0;
 const collect=async()=>{collections++;return {snapshots:[{board,fetchedAt:now.toISOString(),payload:{jobs:[job]}}],blockers:[]};};
 return {run:()=>prepareRadarJobs(client,collect,{now:()=>now,approvedBoards}),queries,collections:()=>collections};
}
test('loads owner preferences and complete history, prepares jobs without writes',async()=>{
 const f=fixture();assert.equal((await f.run()).jobs.length,1);
 assert.ok(f.queries.every(([,column,user])=>column==='user_id'&&user==='owner'));
 assert.equal(f.collections(),1);
});
test('persisted sent history excludes deliveries for this user',async()=>{
 const f=fixture({history:[{job_id:'greenhouse:fixture:1',job_url:job.absolute_url}]});assert.equal((await f.run()).jobs.length,0);
});
test('disabled, unverified and anonymous users never collect sources',async()=>{
 for(const patch of [{saved:{...saved,enabled:false}},{user:{email_confirmed_at:null}},{user:{is_anonymous:true}},{preferencesError:{message:'unavailable'}}]){
  const f=fixture(patch);assert.equal((await f.run()).jobs.length,0);assert.equal(f.collections(),0);
 }
});
test('failed, truncated or malformed history never becomes empty history',async()=>{
 for(const patch of [{historyError:{message:'no table'}},{count:1001},{history:[{job_id:'a',job_url:'invalid'}]}]) {
  const f=fixture(patch);const result=await f.run();assert.equal(result.jobs.length,0);assert.equal(f.collections(),0);
 }
});
test('revocation or preferences changed during collection invalidates selection',async()=>{
 for(const current of [{...saved,enabled:false},{...saved,updated_at:'2026-11-27T09:00:00Z'}]) assert.deepEqual((await fixture({current}).run()).blockers,['preferences_changed']);
});
