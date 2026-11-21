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
test('freshness hides known old and future posts but retains undated active ATS posts',()=>{
 const jobs=[job('1','Engineer','Tel Aviv','2026-11-19T00:00:00Z'),job('2','Engineer','Tel Aviv','2024-11-19T00:00:00Z'),job('3','Engineer','Tel Aviv',null),job('4','Engineer','Tel Aviv','2027-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,location:'Israel'}).map(x=>x.id),['1','3']);
 assert.equal(searchPreviewJobs(jobs,{now,age:'all'}).length,4);
});
test('ranks title matches by recency and excludes location-only matches',()=>{
 const jobs=[job('1','Analyst','Sales','2026-11-19T00:00:00Z'),job('2','Sales Manager','London','2026-10-01T00:00:00Z'),job('3','Sales Lead','London','2026-11-01T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Sales'}).map(x=>x.id),['3','2']);
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

test('Netherlands and Germany country searches recognize city-only ATS locations without admitting unrelated remote jobs',()=>{
 const jobs=[
  job('nl','HR Business Partner','Amsterdam','2026-11-19T00:00:00Z'),
  job('de','HR Business Partner','Berlin','2026-11-19T00:00:00Z'),
  job('us','HR Business Partner','Remote - US','2026-11-19T00:00:00Z'),
  job('other','HR Business Partner','London','2026-11-19T00:00:00Z')
 ];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'HR Business Partner',country:'Netherlands',city:'Amsterdam'}).map(x=>x.id),['nl']);
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'HR Business Partner',country:'הולנד',city:'Amsterdam'}).map(x=>x.id),['nl']);
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'HR Business Partner',country:'גרמניה',city:'Berlin'}).map(x=>x.id),['de']);
 assert.equal(locationMatches('Remote - US','Netherlands'),false);
});

test('unknown role terms never match only employer name or city',()=>{
 const jobs=[job('a','Accountant','Designer City','2026-11-19T00:00:00Z'),job('b','Senior Designer','Berlin','2026-11-19T00:00:00Z')];
 jobs[0].company='Designer Studio';
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Designer'}).map(x=>x.id),['b']);
});

test('supply chain director finds equivalent leadership titles in Israel',()=>{
 const jobs=[job('a','Head of Supply Chain','Tel Aviv','2026-11-19T00:00:00Z'),job('b','Director of Supply Chain','Herzliya','2026-11-19T00:00:00Z'),job('c','Supply Chain Analyst','Tel Aviv','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Supply Chain Director',country:'ישראל',city:'תל אביב'}).map(x=>x.id),['a']);
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Supply Chain Director',country:'Israel'}).map(x=>x.id).sort(),['a','b']);
});

test('director-level supply chain search excludes lower-seniority leads and analysts',()=>{
 const jobs=[
  job('director','Director of Supply Chain','Tel Aviv','2026-11-19T00:00:00Z'),
  job('head','Head of Supply Chain','Tel Aviv','2026-11-19T00:00:00Z'),
  job('lead','Supply Chain Lead','Tel Aviv','2026-11-19T00:00:00Z'),
  job('analyst','Supply Chain Analyst','Tel Aviv','2026-11-19T00:00:00Z'),
 ];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Supply Chain Director',country:'Israel',city:'Tel Aviv'}).map(x=>x.id),['director','head']);
});

test('Israel country filter rejects ATS records explicitly located abroad despite matching city text',()=>{
 assert.equal(locationMatches('Tel Aviv, United States','Israel'),false);
 assert.equal(locationMatches('Haifa, Germany','ישראל'),false);
 assert.equal(locationMatches('Tel Aviv, Israel','Israel'),true);
 assert.equal(locationMatches('Tel Aviv','ישראל'),true);
 const jobs=[job('foreign','Software Engineer','Tel Aviv, USA','2026-11-19T00:00:00Z'),job('local','Software Engineer','Tel Aviv, Israel','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Software Engineer',country:'Israel',city:'Tel Aviv'}).map(x=>x.id),['local']);
});

test('country filters reject matching city names when a different country is explicit',()=>{
 assert.equal(locationMatches('Berlin, United States','Germany'),false);
 assert.equal(locationMatches('Amsterdam, Canada','Netherlands'),false);
 assert.equal(locationMatches('Berlin, Germany','גרמניה'),true);
 assert.equal(locationMatches('Amsterdam, Netherlands','הולנד'),true);
 assert.equal(locationMatches('Berlin','Germany'),true);
 assert.equal(locationMatches('Amsterdam','Netherlands'),true);
});

test('Hebrew ATS locations match both Hebrew and English country/city searches',()=>{
 assert.equal(locationMatches('תל אביב, ישראל','Israel'),true);
 assert.equal(locationMatches('תל אביב, ישראל','ישראל'),true);
 assert.equal(locationMatches('תל אביב, ישראל','תל אביב'),true);
 assert.equal(locationMatches('חיפה, ישראל','חיפה'),true);
 assert.equal(locationMatches('Tel Aviv, Israel, United States','Israel'),false);
 assert.equal(locationMatches('Amsterdam, Netherlands, Germany','Netherlands'),false);
 const jobs=[job('he','Software Engineer','תל אביב, ישראל','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'מהנדס תוכנה',country:'ישראל',city:'תל אביב'}).map(x=>x.id),['he']);
});


test('Israel country search accepts Hebrew-only city ATS locations without explicit country',()=>{
 assert.equal(locationMatches('תל אביב','Israel'),true);
 assert.equal(locationMatches('חיפה','ישראל'),true);
 assert.equal(locationMatches('תל אביב, Germany','Israel'),false);
 const jobs=[job('he-city','Software Engineer','תל אביב','2026-11-19T00:00:00Z'),job('abroad','Software Engineer','תל אביב, Germany','2026-11-19T00:00:00Z')];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Software Engineer',country:'Israel',city:'תל אביב'}).map(x=>x.id),['he-city']);
});

test('Israel filter rejects Hebrew-language foreign country labels even when Israeli city appears',()=>{
 assert.equal(locationMatches('תל אביב, גרמניה','ישראל'),false);
 assert.equal(locationMatches('חיפה, ארצות הברית','Israel'),false);
 assert.equal(locationMatches('הרצליה, הולנד','Israel'),false);
 assert.equal(locationMatches('תל אביב, ישראל','Israel'),true);
 const jobs=[
  job('foreign','Software Engineer','תל אביב, גרמניה','2026-11-19T00:00:00Z'),
  job('local','Software Engineer','תל אביב, ישראל','2026-11-19T00:00:00Z')
 ];
 assert.deepEqual(searchPreviewJobs(jobs,{now,query:'Software Engineer',country:'ישראל',city:'תל אביב'}).map(x=>x.id),['local']);
});
