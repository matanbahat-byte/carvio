import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSearchHandoffProfile, jobSearchSources } from '../lib/job-search.ts';

test('public handoff retains explicit criteria without adding hidden workspace filters', () => {
 const profile=publicSearchHandoffProfile(' HR Director ','Israel','Tel Aviv');
 assert.equal(profile.role,'HR Director');assert.equal(profile.country,'Israel');assert.equal(profile.location,'Tel Aviv');
 for(const key of ['skills','seniority','workModel','employmentType','industry','exclude','radius']) assert.equal(profile[key],'');
 assert.equal(profile.datePosted,'Any time');
 const indeed=new URL(jobSearchSources(profile,'en').find(source=>source.id==='indeed').url);
 assert.equal(indeed.searchParams.has('jt'),false);
 assert.equal(indeed.searchParams.has('fromage'),false);
});
test('Hebrew handoff supports optional city and bounds input without mutating shared defaults',()=>{
 const a=publicSearchHandoffProfile(' מנהל משאבי אנוש ','Israel','');
 assert.equal(a.role,'מנהל משאבי אנוש');assert.equal(a.location,'');
 const b=publicSearchHandoffProfile('x'.repeat(100),'Netherlands',' Amsterdam ');
 assert.equal(b.role.length,80);assert.equal(b.location,'Amsterdam');assert.equal(a.role,'מנהל משאבי אנוש');
});
