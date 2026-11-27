import test from 'node:test';import assert from 'node:assert/strict';
import{emptySearchProfile,jobSearchSources,officialSearchUrl,suggestedRoleAlternatives,captureJobLink,uniqueSavedJobs,savedJobListingUrl}from'../lib/job-search.ts';
test('bilingual role equivalents preserve responsibility and unknown senior titles remain literal',()=>{
 const p={...emptySearchProfile,role:'מנהל שרשרת אספקה',country:'Israel',location:'Tel Aviv'};
 for(const source of jobSearchSources(p)){assert.match(source.query,/Supply Chain Manager/);assert.doesNotMatch(source.query,/Director|Head of/);}
 assert.match(new URL(officialSearchUrl(p)).searchParams.get('q'),/Supply Chain Manager/);
 assert.ok(!suggestedRoleAlternatives(p.role).some(role=>/Director|Head of/.test(role)));
 for(const role of ['Senior מנהל מוצר','Unusual Principal Specialist'])for(const source of jobSearchSources({...p,role}).filter(s=>s.id!=='google'))assert.doesNotMatch(source.query,/ OR /);
});
test('searches, employer boards and duplicate postings cannot masquerade as separate saved jobs',()=>{
 for(const url of ['https://linkedin.com/jobs/search/?keywords=x','https://job-boards.greenhouse.io/acme','https://boards.greenhouse.io/acme/','https://jobs.lever.co/acme?team=engineering','https://jobs.ashbyhq.com/acme','https://apply.workable.com/acme/','https://acme.wd1.myworkdayjobs.com/en-US/careers']){assert.throws(()=>captureJobLink(url));assert.equal(savedJobListingUrl(url),null);}
 const a={id:'a',jobUrl:'https://linkedin.com/jobs/view/1234'},b={id:'b',jobUrl:'https://il.linkedin.com/jobs/view/developer-1234?trk=x'},c={id:'c',jobUrl:'https://linkedin.com/jobs/view/1235'},d={id:'d',jobUrl:''};
 assert.deepEqual(uniqueSavedJobs([a,b,c,d]).map(x=>x.id),['a','c','d']);assert.ok(captureJobLink('https://job-boards.greenhouse.io/acme/jobs/12345'));
});
