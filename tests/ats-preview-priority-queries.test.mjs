import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPreviewJobs } from '../lib/free-job-preview-search.ts';

// Synthetic regression fixtures ONLY. Never report these scores as live Precision@10.
// Live acceptance requires a timestamped, independently reviewed ATS sample.
const now=Date.parse('2026-11-21T00:00:00Z');
const sample=(id,title,location,provider='lever')=>({
 id, title, location, provider, company:'Fixture employer',
 url:'https://jobs.lever.co/fixture/'+id, postedAt:'2026-11-20T00:00:00Z'
});
const cases=[
 {name:'Supply Chain Director Israel/Tel Aviv',query:'Supply Chain Director',country:'Israel',city:'Tel Aviv',
  jobs:[sample('sc1','Director of Supply Chain','Tel Aviv'),sample('sc2','Supply Chain Analyst','Tel Aviv'),sample('sc3','Head of Supply Chain','Berlin'),sample('sc4','Head of Supply Chain','Tel Aviv')],
  expected:['sc1','sc4']},
 {name:'Software Engineer Israel/Tel Aviv',query:'Software Engineer',country:'Israel',city:'Tel Aviv',
  jobs:[sample('sw1','Software Engineer','Tel Aviv'),sample('sw2','Software Sales Engineer','Tel Aviv'),sample('sw3','Backend Engineer','Tel Aviv'),sample('sw4','Software Engineer','London')],
  expected:['sw1','sw3']},
 {name:'HR Business Partner Israel',query:'HR Business Partner',country:'Israel',
  jobs:[sample('hr1','HR Business Partner','Herzliya'),sample('hr2','Senior People Partner','Tel Aviv'),sample('hr3','HR Recruiter','Tel Aviv'),sample('hr4','HR Business Partner','Berlin')],
  expected:['hr1','hr2']}
];
test('three priority role/location scenarios: explicit synthetic relevance regression',()=>{
 for(const scenario of cases){
  const results=searchPreviewJobs(scenario.jobs,{query:scenario.query,country:scenario.country,city:scenario.city,now});
  const actual=results.map(job=>job.id);
  assert.deepEqual(actual.slice().sort(),scenario.expected.slice().sort(),scenario.name);
  assert.equal(new Set(actual).size,actual.length,scenario.name+' duplicate IDs');
  assert.ok(results.every(job=>job.url.startsWith('https://')),scenario.name+' invalid link scheme');
 }
});
