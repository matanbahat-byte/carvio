import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPreviewJobs } from '../lib/free-job-preview-search.ts';
const now=Date.parse('2026-11-20T12:00:00Z');
const job=(id,title,location='Tel Aviv',company='Example',daysAgo=1)=>({id,title,location,company,postedAt:new Date(now-daysAgo*86_400_000).toISOString(),url:'https://jobs.lever.co/example/'+id,provider:'lever'});
const cases=[
 {query:'Software Engineer',positive:['Software Engineer','Backend Engineer','Full Stack Engineer'],negative:['Sales Manager','Software Recruiter']},
 {query:'HR Business Partner',positive:['HR Business Partner','Senior People Partner','HRBP'],negative:['Accountant','HR Coordinator']},
 {query:'Supply Chain Manager',positive:['Supply Chain Manager','Head of Supply Chain','Supply Chain Planning Manager'],negative:['Software Engineer','Procurement Analyst']},
];
test('known-role search has 100% precision on controlled positive/negative fixtures',()=>{
 for(const item of cases){
  const jobs=[...item.positive.map((title,i)=>job('p'+i,title)),...item.negative.map((title,i)=>job('n'+i,title,'Tel Aviv',item.query))];
  const results=searchPreviewJobs(jobs,{now,query:item.query});
  assert.deepEqual(new Set(results.map(j=>j.id)),new Set(item.positive.map((_,i)=>'p'+i)),item.query);
 }
});
test('unrecognized general keywords still find company and location matches',()=>{
 const jobs=[job('1','Analyst','London','Example'),job('2','Analyst','Paris','London Consulting'),job('3','Analyst','Paris','Example')];
 assert.deepEqual(new Set(searchPreviewJobs(jobs,{now,query:'London'}).map(j=>j.id)),new Set(['1','2']));
});
test('search does not mutate caller ordering',()=>{
 const jobs=[job('1','Analyst','London','Example',10),job('2','Analyst','London','Example',1)];
 assert.deepEqual(searchPreviewJobs(jobs,{now}).map(j=>j.id),['2','1']);
 assert.deepEqual(jobs.map(j=>j.id),['1','2']);
});
