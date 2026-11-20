import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPreviewJobs, titleMatches, locationMatches } from '../lib/free-job-preview-search.ts';
const now=Date.parse('2026-11-20T12:00:00Z');
const job=(id,title,location,postedAt)=>({id,title,location,postedAt,company:'Example',url:'https://jobs.lever.co/example/'+id,provider:'lever'});
test('country Israel includes city-only locations, not unrelated remote jobs',()=>{
 assert.equal(locationMatches('Tel Aviv, Israel','Israel'),true);
 assert.equal(locationMatches('Herzliya','Israel'),true);
 assert.equal(locationMatches('Berlin, Germany','Israel'),false);
 assert.equal(locationMatches('Remote - US','Israel'),false);
});
test('related role aliases match title but not arbitrary unrelated jobs',()=>{
 assert.equal(titleMatches('Senior People Partner','HR Business Partner'),true);
 assert.equal(titleMatches('Head of Supply Chain','Supply Chain Manager'),true);
 assert.equal(titleMatches('Accountant','Supply Chain Manager'),false);
});
test('freshness hides old, undated and future posts, all restores old posts',()=>{
 const jobs=[job('1','Engineer','Tel Aviv','2026-11-19T00:00:00Z'),job('2','Engineer','Tel Aviv','2024-11-19T00:00:00Z'),job('3','Engineer','Tel Aviv',null),job('4','Engineer','Tel Aviv','2027-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,location:'Israel'}).map(x=>x.id),['1']);
 assert.equal(searchPreviewJobs(jobs,{now,age:'all'}).length,4);
});
test('ranks title matches before company/location and then by recency',()=>{
 const jobs=[job('1','Analyst','Sales','2026-11-19T00:00:00Z'),job('2','Sales Manager','London','2026-10-01T00:00:00Z'),job('3','Sales Lead','London','2026-11-01T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Sales'}).map(x=>x.id),['3','2','1']);
});

test('role queries do not match company or location alone',()=>{
 const jobs=[job('1','Accountant','Tel Aviv','2026-11-19T00:00:00Z'),job('2','Senior People Partner','Tel Aviv','2026-11-18T00:00:00Z')];
 jobs[0].company='HR Business Partner Consulting';
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'HR Business Partner'}).map(x=>x.id),['2']);
});

test('Software Engineering role family includes Software Engineer titles without sales roles',()=>{
 const jobs=[job('1','Software Engineer Team Leader','Tel Aviv','2026-11-19T00:00:00Z'),job('2','Enterprise Account Manager','Anywhere in the United States','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Software Engineering',location:'Israel'}).map(x=>x.id),['1']);
});

test('simple job country city search applies all three fields together',()=>{
 const jobs=[job('1','Software Engineer','Tel Aviv, Israel','2026-11-19T00:00:00Z'),job('2','Sales Manager','Tel Aviv, Israel','2026-11-19T00:00:00Z'),job('3','Software Engineer','London, UK','2026-11-19T00:00:00Z'),job('4','Software Engineer','Haifa, Israel','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Software Engineer',country:'Israel',city:'Tel Aviv'}).map(x=>x.id),['1']);
});

test('Hebrew job, country and city match English ATS records',()=>{
 const jobs=[job('1','Senior Software Engineer','Tel Aviv','2026-11-19T00:00:00Z'),job('2','Software Engineer','London','2026-11-19T00:00:00Z'),job('3','Sales Manager','Tel Aviv','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'מהנדס תוכנה',country:'ישראל',city:'תל אביב'}).map(x=>x.id),['1']);
 assert.equal(locationMatches('Haifa','חיפה'),true);
 assert.equal(locationMatches('London','ישראל'),false);
});

test('common Hebrew synonyms match English employer job titles',()=>{
 const jobs=[job('1','Senior Software Developer','Tel Aviv','2026-11-19T00:00:00Z'),job('2','Product Manager','Tel Aviv','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'מפתח תוכנה',country:'ישראל',city:'תל אביב'}).map(x=>x.id),['1']);
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'מנהלת מוצר',country:'ישראל',city:'תל אביב'}).map(x=>x.id),['2']);
});
