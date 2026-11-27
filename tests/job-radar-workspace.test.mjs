import test from 'node:test';import assert from 'node:assert/strict';
import {readRadarWorkspace,radarJobAvailable} from '../lib/job-radar-workspace.ts';
const job={id:'a'.repeat(64),title:'HR Manager',company:'Fixture',location:'Tel Aviv',source_url:'https://boards.greenhouse.io/fixture/jobs/123',provider:'greenhouse',is_active:true,sent_at:'2026-11-27T07:00:00Z',expires_at:'2026-12-01T07:00:00Z'};
test('recent sent jobs dedup, sort and cap; malformed/search links cannot be saved',()=>{
 const jobs=[job,{...job},{...job,id:'b'.repeat(64),sent_at:'2026-11-28T07:00:00Z'},{...job,id:'c'.repeat(64),source_url:'javascript:alert(1)'},{...job,id:'d'.repeat(64),sent_at:'invalid'},{...job,id:'e'.repeat(64),source_url:'https://www.linkedin.com/jobs/search/?keywords=HR'}];
 const r=readRadarWorkspace({runtimeEnabled:true,jobs});assert.equal(r.runtimeEnabled,true);assert.equal(r.jobs.length,2);assert.equal(r.jobs[0].id,'b'.repeat(64));assert.deepEqual(readRadarWorkspace(null),{runtimeEnabled:false,jobs:[]});
 const many=Array.from({length:25},(_,i)=>({...job,id:i.toString(16).padStart(64,'0')}));assert.equal(readRadarWorkspace({jobs:many}).jobs.length,20);
});
test('closed and expired jobs remain visible as history but are not available for a new save',()=>{
 assert.equal(radarJobAvailable(job,Date.parse('2026-11-28')),true);assert.equal(radarJobAvailable({...job,is_active:false},Date.parse('2026-11-28')),false);assert.equal(radarJobAvailable(job,Date.parse('2026-12-02')),false);
});
