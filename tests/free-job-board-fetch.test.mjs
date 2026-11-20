import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublicBoardJobs } from '../lib/free-job-board-fetch.ts';
const board={provider:'lever',token:'example',company:'Example'};
const response=(body, status=200, contentType='application/json')=>new Response(body,{status,headers:{'content-type':contentType}});
test('fetches only the fixed official endpoint and normalizes result',async()=>{
  let endpoint;
  const result=await fetchPublicBoardJobs(board,{fetcher:async url=>{endpoint=url;return response(JSON.stringify([{id:'1',text:'Planner',hostedUrl:'https://jobs.lever.co/example/1'}]));}});
  assert.equal(endpoint,'https://api.lever.co/v0/postings/example?mode=json');
  assert.equal(result.jobs.length,1);
});
test('fails closed on invalid board, non-JSON, oversized and failing response',async()=>{
  assert.equal((await fetchPublicBoardJobs({...board,token:'../unsafe'},{fetcher:async()=>{throw Error('should not fetch')}})).status,'invalid');
  assert.equal((await fetchPublicBoardJobs(board,{fetcher:async()=>response('bad',200,'text/html')})).status,'unavailable');
  assert.equal((await fetchPublicBoardJobs(board,{fetcher:async()=>response('x'.repeat(2_000_001))})).status,'unavailable');
  assert.equal((await fetchPublicBoardJobs(board,{fetcher:async()=>{throw Error('offline')}})).status,'unavailable');
});
