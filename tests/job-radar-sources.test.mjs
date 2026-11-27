import test from 'node:test';
import assert from 'node:assert/strict';
import { createRadarSourceCollector } from '../lib/job-radar-sources.ts';
const source={board:{provider:'lever',token:'fixture',company:'Fixture'},permissionReference:'fixture-only'};
const response=(payload=[])=>Response.json(payload);
test('default configuration makes no requests',async()=>{
 let calls=0; const result=await createRadarSourceCollector(async()=>{calls++;return response();})();
 assert.equal(calls,0); assert.deepEqual(result.blockers,['no_authorized_source']);
});
test('reuses cache and coalesces concurrent collections without exposing user preferences',async()=>{
 let calls=0;
 const collect=createRadarSourceCollector(async(url,options)=>{calls++;assert.equal(url,'https://api.lever.co/v0/postings/fixture?mode=json');assert.equal(options.redirect,'error');return response();},[source]);
 const results=await Promise.all([collect(),collect()]);
 assert.equal(results[0].snapshots.length,1);assert.equal(results[1].snapshots.length,1);
 await collect(); assert.equal(calls,1);
});
test('HTTP errors, malformed JSON payloads and oversized bodies fail closed and back off',async()=>{
 for(const make of [()=>new Response('',{status:429}),()=>response({error:'bad'}),()=>new Response('x'.repeat(2_000_001),{headers:{'content-type':'application/json'}})]) {
  let calls=0;const collect=createRadarSourceCollector(async()=>{calls++;return make();},[source]);
  assert.equal((await collect()).snapshots.length,0);assert.equal((await collect()).snapshots.length,0);assert.equal(calls,1);
 }
});
test('missing permissions are skipped and per-run request budget is bounded',async()=>{
 let calls=0;
 const collect=createRadarSourceCollector(async()=>{calls++;return response();},Array.from({length:9},(_,i)=>({...source,board:{...source.board,token:`fixture${i}`}})));
 assert.equal((await collect()).snapshots.length,5);assert.equal(calls,5);
 assert.equal((await createRadarSourceCollector(async()=>{throw Error('must not fetch');},[{...source,permissionReference:''}])()).snapshots.length,0);
});
