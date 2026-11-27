import test from 'node:test';
import assert from 'node:assert/strict';
import {radarDailyReport} from '../lib/job-radar-report.ts';
const event=(digestId,event,at='2026-11-27T10:00:00Z')=>({digestId,event,at});
test('same-day sent cohort deduplicates and excludes unrelated or premature actions',()=>{
 const r=radarDailyReport([event('a','sent'),event('a','sent'),event('a','clicked'),event('a','clicked'),event('a','returned'),event('a','saved'),event('a','applied','2026-11-28T00:00:00Z'),event('b','clicked'),event('a','applied','2026-11-27T09:00:00Z'),event('b','failed'),event('a','failed')],'2026-11-27');
 assert.deepEqual(r,{day:'2026-11-27',sent:1,failed:1,clicked:1,returned:1,saved:1,applied:0,clickRate:1});
});
test('empty cohort is not a zero conversion rate',()=>assert.equal(radarDailyReport([],'2026-11-27').clickRate,null));
test('invalid date rejected',()=>assert.throws(()=>radarDailyReport([],'2026-02-30')));
