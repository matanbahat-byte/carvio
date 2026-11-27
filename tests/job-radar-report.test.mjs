import test from 'node:test';import assert from 'node:assert/strict';
import {radarDailyReport,radarDayBounds} from '../lib/job-radar-report.ts';
const event=(digestId,event,at='2026-11-27T10:00:00Z',mode='live')=>({digestId,event,at,mode});
const asOf=new Date('2026-12-06T00:00:00Z');
test('deduplicates each digest, includes late conversions and rejects unrelated, early and out-of-window events',()=>{
 const r=radarDailyReport([event('a','sent'),event('a','sent'),event('a','clicked'),event('a','clicked'),event('a','returned'),event('a','saved','2026-11-28T10:00:00Z'),event('a','applied','2026-11-29T10:00:00Z'),event('a','applied','2026-11-27T09:00:00Z'),event('b','clicked'),event('b','failed'),event('c','unknown'),event('d','dry_run_ready','2026-11-27T10:00:00Z','dry-run'),event('d','sent','2026-11-27T10:00:00Z','dry-run')],'2026-11-27',{asOf});
 assert.equal(r.sent,1);assert.equal(r.attempted,3);assert.equal(r.failed,1);assert.equal(r.unknown,1);assert.equal(r.dryRunReady,1);
 for(const key of ['clicked','returned','saved','applied'])assert.equal(r[key],1);for(const key of ['clickRate','returnRate','saveRate','applyRate'])assert.equal(r[key],1);assert.equal(r.deliverySuccessRate,1/3);
 assert.ok(r.cohortMature);assert.ok(!JSON.stringify(r).includes('digestId'));
});
test('Israel midnight, not UTC midnight, defines the cohort',()=>{
 const r=radarDailyReport([event('a','sent','2026-11-26T22:30:00Z'),event('b','sent','2026-11-27T22:30:00Z')],'2026-11-27',{asOf});assert.equal(r.sent,1);
 assert.equal(radarDayBounds('2026-03-27').end-radarDayBounds('2026-03-27').start,23*3600000);
 assert.equal(radarDayBounds('2026-10-25').end-radarDayBounds('2026-10-25').start,25*3600000);
});
test('as-of cutoff prevents future attribution; seven-day window is explicit',()=>{
 const r=radarDailyReport([event('a','sent'),event('a','clicked','2026-11-28T10:00:00Z'),event('a','applied','2026-12-04T10:00:00Z')],'2026-11-27',{asOf:new Date('2026-11-27T20:00:00Z')});assert.equal(r.clicked,0);assert.equal(r.applied,0);assert.equal(r.cohortMature,false);
 assert.equal(radarDailyReport([event('a','sent'),event('a','applied','2026-12-04T10:00:00Z')],'2026-11-27',{asOf}).applied,0);
});
test('empty cohort has null conversion rates and rejects impossible dates',()=>{assert.equal(radarDailyReport([],'2026-11-27',{asOf}).clickRate,null);assert.throws(()=>radarDailyReport([],'2026-02-30'));});
