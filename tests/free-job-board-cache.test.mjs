import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachedBoardFetcher } from '../lib/free-job-board-cache.ts';
const board={provider:'lever',token:'example',company:'Example'};
const response=()=>new Response(JSON.stringify([{id:'1',text:'Planner',hostedUrl:'https://jobs.lever.co/example/1'}]),{headers:{'content-type':'application/json'}});
test('reuses successful responses until expiry, then refreshes',async()=>{
 let clock=0,calls=0;
 const get=createCachedBoardFetcher({now:()=>clock,ttlMs:30_000,fetcher:async()=>{calls++;return response();}});
 assert.equal((await get(board)).jobs.length,1);
 assert.equal((await get(board)).jobs.length,1);
 assert.equal(calls,1);
 clock=30_001;
 await get(board);
 assert.equal(calls,2);
});
test('coalesces simultaneous requests for same board',async()=>{
 let calls=0;
 const get=createCachedBoardFetcher({fetcher:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return response();}});
 const results=await Promise.all([get(board),get(board),get(board)]);
 assert.equal(calls,1);
 assert.ok(results.every(r=>r.status==='ok'));
});
test('does not cache failed requests',async()=>{
 let calls=0;
 const get=createCachedBoardFetcher({fetcher:async()=>{calls++;throw Error('offline');}});
 await get(board);await get(board);
 assert.equal(calls,2);
});
test('invalid boards never reach network',async()=>{
 const get=createCachedBoardFetcher({fetcher:async()=>{throw Error('unexpected network');}});
 assert.equal((await get({...board,token:'../bad'})).status,'invalid');
});

test('caller mutation cannot poison cached job details',async()=>{
 let calls=0;
 const get=createCachedBoardFetcher({fetcher:async()=>{calls++;return response();}});
 const first=await get(board);
 first.jobs[0].title='Tampered';
 first.jobs.push({...first.jobs[0],id:'fake'});
 const second=await get(board);
 assert.equal(calls,1);
 assert.equal(second.jobs.length,1);
 assert.equal(second.jobs[0].title,'Planner');
 second.jobs[0].title='Also tampered';
 assert.equal((await get(board)).jobs[0].title,'Planner');
});
