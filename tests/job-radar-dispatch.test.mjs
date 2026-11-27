import test from 'node:test';
import assert from 'node:assert/strict';
import {radarScheduleSlot} from '../lib/job-radar-schedule.ts';
import {radarDispatchFixture} from './fixtures/job-radar-dispatch.mjs';
test('09:00 Israel time in winter, summer and DST transition weeks; two or three weekly sends',()=>{
 for(const stamp of ['2026-11-29T07:00:00Z','2026-07-05T06:00:00Z','2026-03-29T06:00:00Z','2026-10-25T07:00:00Z'])assert.ok(radarScheduleSlot(new Date(stamp),3));
 assert.equal(radarScheduleSlot(new Date('2026-12-01T07:00:00Z'),2),null);
 assert.ok(radarScheduleSlot(new Date('2026-12-03T07:00:00Z'),2));
 for(const stamp of ['2026-11-29T06:00:00Z','2026-11-29T07:15:00Z','2026-11-30T07:00:00Z'])assert.equal(radarScheduleSlot(new Date(stamp),3),null);
});
test('default dry-run selects max five, revalidates, logs simulation and never invokes Gmail or catalog publishing',async()=>{
 const f=radarDispatchFixture();assert.deepEqual(await f.run(),{status:'dry_run_ready',jobs:5});
 assert.deepEqual(f.counts(),{collections:2,sends:0,publishes:0,verifyCalls:0});
 assert.equal(f.events.at(-1).state,'dry_run_ready');assert.ok(!f.events.some(e=>e.state==='sent'));
});
test('same scheduled slot is claimed at most once, including parallel workers',async()=>{
 const f=radarDispatchFixture();const results=await Promise.all([f.run(),f.run()]);assert.equal(results.filter(r=>r.status==='dry_run_ready').length,1);assert.equal(f.counts().sends,0);
});
test('no consent, unverified account, missing history, no new jobs, closed jobs and past deliveries produce no email',async()=>{
 for(const patch of [{subscription:{enabled:false}},{subscription:{verified:false}},{historyMissing:true},{jobs:[]},{closed:true},{sent:Array.from({length:6},(_,i)=>({id:`greenhouse:fixture:${i+1}`,url:`https://boards.greenhouse.io/fixture/jobs/${i+1}`}))}]) {
  const f=radarDispatchFixture(patch);const result=await f.run();assert.notEqual(result.status,'dry_run_ready');assert.equal(f.counts().sends,0);
 }
});
test('revocation, account changes, preference edits and lost DB gate cancel at final boundary',async()=>{
 for(const patch of [{latest:{enabled:false}},{latest:{email:'changed@example.test'}},{latest:{updatedAt:'changed'}},{gateDenied:true}]){
  const f=radarDispatchFixture(patch);assert.equal((await f.run()).status,'cancelled');assert.equal(f.counts().sends,0);
 }
});
test('live disabled by default; simulated wrong sender rejected and uncertain Gmail response is never retried',async()=>{
 const disabled=radarDispatchFixture();assert.equal((await disabled.run('live')).code,'live_disabled');assert.equal(disabled.counts().collections,0);
 const wrong=radarDispatchFixture({liveEnabled:true,wrongSender:true});assert.equal((await wrong.run('live')).status,'failed');assert.equal(wrong.counts().sends,0);
 const uncertain=radarDispatchFixture({liveEnabled:true,uncertain:true});assert.equal((await uncertain.run('live')).status,'unknown');await uncertain.run('live');assert.equal(uncertain.counts().sends,1);
});
test('only a mocked provider acknowledgment reaches simulated success; failure before send is logged',async()=>{
 const f=radarDispatchFixture({liveEnabled:true});assert.equal((await f.run('live')).status,'sent');assert.equal(f.events.at(-1).providerId,'mock-provider-id');
 const fail=radarDispatchFixture();fail.deps.collectFresh=async()=>{throw Error('fixture failure');};assert.equal((await fail.run()).status,'failed');assert.equal(fail.events.at(-1).state,'failed');
});
