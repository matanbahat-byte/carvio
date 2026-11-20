import test from 'node:test';
import assert from 'node:assert/strict';
import { publicBoardEndpoint, normalizePublicBoardJobs, dedupePublicJobs } from '../lib/free-job-sources.ts';

const gh={provider:'greenhouse',token:'sample-company',company:'Example Co'};
const lever={provider:'lever',token:'sample-company',company:'Example Co'};

test('constructs public board URLs without keys or user-controlled hosts',()=>{
  assert.equal(publicBoardEndpoint(gh),'https://boards-api.greenhouse.io/v1/boards/sample-company/jobs');
  assert.equal(publicBoardEndpoint(lever),'https://api.lever.co/v0/postings/sample-company?mode=json');
  assert.throws(()=>publicBoardEndpoint({...gh,token:'../../evil'}),/Invalid board/);
});
test('normalizes Greenhouse listings and rejects missing or foreign-host links',()=>{
  const jobs=normalizePublicBoardJobs(gh,{jobs:[
    {id:12,title:' HR Business Partner ',location:{name:'Tel Aviv'},absolute_url:'https://job-boards.greenhouse.io/sample-company/jobs/12',updated_at:'2026-11-20T08:00:00Z'},
    {id:13,title:'Bad',absolute_url:'https://evil.example/jobs/13'},
    {id:14,title:'No URL'}
  ]});
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].title,'HR Business Partner');
  assert.equal(jobs[0].location,'Tel Aviv');
  assert.equal(jobs[0].postedAt,null); // updated_at is not publication time
});
test('normalizes Lever listings without inventing fields',()=>{
  const jobs=normalizePublicBoardJobs(lever,[{id:'abc',text:'Supply Chain Manager',hostedUrl:'https://jobs.lever.co/sample-company/abc',categories:{location:'Berlin'}},{id:'bad',text:'Bad',hostedUrl:'javascript:alert(1)'}]);
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].title,'Supply Chain Manager');
  assert.equal(jobs[0].location,'Berlin');
  assert.equal(jobs[0].postedAt,null);
});
test('deduplicates identical links without dropping distinct postings',()=>{
  const jobs=normalizePublicBoardJobs(gh,{jobs:[{id:1,title:'A',absolute_url:'https://boards.greenhouse.io/demo/jobs/1'},{id:1,title:'A',absolute_url:'https://boards.greenhouse.io/demo/jobs/1'},{id:2,title:'B',absolute_url:'https://boards.greenhouse.io/demo/jobs/2'}]});
  assert.equal(dedupePublicJobs([...jobs,...jobs]).length,2);
});

test('parses real Lever millisecond timestamps and Greenhouse published dates',()=>{
  const leverJobs=normalizePublicBoardJobs(lever,[{id:'live',text:'Operations Lead',hostedUrl:'https://jobs.lever.co/sample-company/live',createdAt:1795161600000,categories:{location:'Tel Aviv'}}]);
  assert.equal(leverJobs[0].postedAt,new Date(1795161600000).toISOString());
  const greenhouseJobs=normalizePublicBoardJobs(gh,{jobs:[{id:20,title:'Designer',absolute_url:'https://boards.greenhouse.io/sample-company/jobs/20',first_published:'2026-11-19T09:00:00Z',updated_at:'2026-11-20T09:00:00Z'}]});
  assert.equal(greenhouseJobs[0].postedAt,'2026-11-19T09:00:00.000Z');
});

test('accepts employer-hosted Greenhouse job only when gh_jid matches API record',()=>{
  const jobs=normalizePublicBoardJobs(gh,{jobs:[
    {id:321,title:'Planner',absolute_url:'https://careers.example.org/apply?gh_jid=321'},
    {id:322,title:'Wrong ID',absolute_url:'https://careers.example.org/apply?gh_jid=999'},
    {id:323,title:'Insecure',absolute_url:'http://careers.example.org/apply?gh_jid=323'}
  ]});
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].url,'https://careers.example.org/apply?gh_jid=321');
});

test('uses official EU Lever API host only for explicit EU region',()=>{
  assert.equal(publicBoardEndpoint({...lever,region:'eu'}),'https://api.eu.lever.co/v0/postings/sample-company?mode=json');
  assert.throws(()=>publicBoardEndpoint({...lever,region:'other'}),/Invalid board/);
});
