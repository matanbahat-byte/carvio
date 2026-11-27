import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySearchProfile, jobSearchSources, officialSearchUrl } from '../lib/job-search.ts';

const cases = [
 ['Software Engineer','Israel','Tel Aviv'], ['מהנדס תוכנה','Israel','תל אביב'],
 ['HR Director','Israel',''], ['מנהל משאבי אנוש','Israel',''],
 ['Supply Chain Manager','Netherlands','Amsterdam'], ['Product Manager','Germany','Berlin'],
 ['Data Analyst','Israel','Haifa'], ['מנהל תפעול','Israel',''],
 ['Accountant','Israel','Jerusalem'], ['רואה חשבון','Israel','ירושלים'],
 ['Teacher','Netherlands','Haarlem'], ['Registered Nurse','Germany','Düsseldorf'],
 ['Graphic Designer','Spain','Madrid'], ['Electrician','Portugal','Lisbon'],
 ['Marketing Manager','France','Paris'], ['HRBP','United Kingdom','London'],
 ['QA Engineer','Israel','Beer Sheva'], ['מפתח תוכנה','Israel','חיפה'],
 ['Operations Manager','Ireland','Dublin'], ['Data Scientist','United States','Boston']
];
for (const [role,country,location] of cases) {
 test(`outbound search benchmark: ${role} / ${country} / ${location}`, () => {
  const profile = {...emptySearchProfile,role,country,location,alternativeRoles:'',datePosted:'Any time'};
  for (const language of ['he','en']) {
   const sources = jobSearchSources(profile,language);
   assert.deepEqual(sources.map(s=>s.id),['linkedin','indeed','google']);
   for (const source of sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol,'https:');
    assert.ok(source.query.includes(role),source.id);
   }
   const linkedin = new URL(sources[0].url);
   assert.equal(linkedin.searchParams.get('location'),location ? `${location}, ${country}` : country);
   const official = new URL(officialSearchUrl(profile,language));
   assert.equal(official.protocol,'https:');
   assert.ok(official.searchParams.get('q').includes(role));
   assert.ok(official.searchParams.get('q').includes(location || country));
  }
 });
}

