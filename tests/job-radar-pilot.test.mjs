import test from 'node:test';import assert from 'node:assert/strict';
import {radarPilotReadiness} from '../lib/job-radar-pilot.ts';
import {radarDispatchFixture} from './fixtures/job-radar-dispatch.mjs';
import {radarDailyReport} from '../lib/job-radar-report.ts';
test('Two consenting verified pilot accounts complete dry-run without Gmail and never enter real delivery conversion rates',async()=>{
 const subscriptions=[];const events=[];
 for(let i=0;i<2;i++){
  const f=radarDispatchFixture({subscription:{userId:'fixture-'+i,email:'fixture-'+i+'@example.test'}});subscriptions.push(f.subscription);
  const result=await f.run();assert.equal(result.status,'dry_run_ready');assert.equal(f.counts().sends,0);
  events.push({digestId:'fixture-'+i,event:'dry_run_ready',at:'2026-11-29T07:00:00Z',mode:'dry-run'});
 }
 const readiness=radarPilotReadiness(subscriptions,{sourceApproved:false,oauthConfigured:false,routesReleased:false});assert.equal(readiness.eligibleCount,2);assert.equal(readiness.ready,false);assert.ok(!JSON.stringify(readiness).includes('example.test'));
 const report=radarDailyReport(events,'2026-11-29',{asOf:new Date('2026-11-30')});assert.equal(report.sent,0);assert.equal(report.dryRunReady,2);assert.equal(report.clickRate,null);
});
test('pilot eligibility excludes absent consent, unverified accounts and duplicates without revealing identities',()=>{
 const s=radarDispatchFixture().subscription;
 const result=radarPilotReadiness([s,s,{...s,userId:'x',verified:false},{...s,userId:'y',enabled:false}],{sourceApproved:true,oauthConfigured:true,routesReleased:true});assert.equal(result.eligibleCount,1);assert.equal(result.ready,false);assert.throws(()=>radarPilotReadiness([],{sourceApproved:false,oauthConfigured:false,routesReleased:false},4));
});

test('exactly two verified consents satisfy cohort readiness; other pilot sizes are rejected',()=>{
 const s=radarDispatchFixture().subscription;const checks={sourceApproved:true,oauthConfigured:true,routesReleased:true};
 assert.equal(radarPilotReadiness([s,{...s,userId:'second'}],checks).ready,true);
 assert.ok(radarPilotReadiness([s],checks).blockers.includes('two_explicit_consents_required'));
 for(const size of [1,3,5,10])assert.throws(()=>radarPilotReadiness([],checks,size));
});
