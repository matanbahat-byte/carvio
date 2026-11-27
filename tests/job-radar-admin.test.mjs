import test from 'node:test';import assert from 'node:assert/strict';
import {radarAdminWindow,radarAdminChange} from '../lib/job-radar-admin.ts';
test('admin day/week comparisons use calendar dates including year and DST boundaries',()=>{
 assert.deepEqual(radarAdminWindow('2026-11-27','day','pilot'),{start:'2026-11-27',days:1,cohort:'pilot'});
 assert.deepEqual(radarAdminWindow('2027-01-02','week','test'),{start:'2026-12-27',days:7,cohort:'test'});
 assert.equal(radarAdminWindow('2026-03-29','week','real').start,'2026-03-23');
 for(const args of [['2026-02-30','day','pilot'],['2026-11-27','month','pilot'],['2026-11-27','day','all']])assert.throws(()=>radarAdminWindow(...args));
});
test('unknown coverage is never converted into zero change or a made-up percentage',()=>{assert.equal(radarAdminChange(null,4),null);assert.equal(radarAdminChange(3,null),null);assert.equal(radarAdminChange(3,0),3);assert.equal(radarAdminChange(1,4),-3);});
