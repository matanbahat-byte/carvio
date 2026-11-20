import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachedPublicBoardFetcher } from '../lib/free-job-board-cache.ts';
const board={provider:'lever',token:'example',company:'Example'};
const data=()=>new Response(JSON.stringify([{id:'1',text:'Planner',hostedUrl:'https://jobs.lever.co/example/1'}]),{headers:{'content-type':'application/json'}});
test('reuses successful board response until TTL expires',async()=>{
  let clock=0,calls=0;
  const cached=createCachedPublicBoardFetcher({now:()=>clock,ttlMs:1000,fetcher:async()=>{calls++;return data();}});
  assert.equal((await cached(board)).jobs.length,1);
  await cached(board);assert.equal(calls,1);
  clock=1001;await cached(board);assert.equal(calls,2);
});
test('coalesces concurrent requests to the same board',async()=>{
  let calls=0;
  const cached=createCachedPublicBoardFetcher({fetcher:async()=>{calls++;await Promise.resolve();return data();}});
  const [a,b]=await Promise.all([cached(board),cached(board)]);
  assert.equal(calls,1);assert.equal(a.status,'ok');assert.equal(b.status,'ok');
});
test('does not cache failed responses',async()=>{
  let calls=0;
  const cached=createCachedPublicBoardFetcher({fetcher:async()=>{calls++;return new Response('down',{status:503});}});
  await cached(board);await cached(board);assert.equal(calls,2);
});
test('invalid tokens never call the upstream',async()=>{
  const cached=createCachedPublicBoardFetcher({fetcher:async()=>{throw Error('should not run');}});
  assert.equal((await cached({...board,token:'../bad'})).status,'invalid');
});
