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

test('handoff requires an explicit workspace search and retains its language', async () => {
 const { readPublicSearchHandoff } = await import('../lib/job-search.ts');
 assert.equal(readPublicSearchHandoff(new URLSearchParams('findRole=Engineer')),null);
 assert.equal(readPublicSearchHandoff(new URLSearchParams('workspace=1&findRole=%20')),null);
 for (const language of ['he','en']) {
  const input = new URLSearchParams({workspace:'1',findRole:'מנהל מוצר',findCountry:'Israel',findCity:'Tel Aviv',findLang:language});
  const result = readPublicSearchHandoff(input);
  assert.equal(result.language,language);
  assert.equal(result.profile.role,'מנהל מוצר');
  assert.equal(result.profile.country,'Israel');
  assert.equal(result.profile.location,'Tel Aviv');
  assert.equal(input.get('findRole'),'מנהל מוצר');
 }
});

test('public search handoff retains a valid timestamp without inventing one for old links', async()=>{
 const {readPublicSearchHandoff}=await import('../lib/job-search.ts');
 const params=new URLSearchParams({workspace:'1',findRole:'Engineer',findCountry:'Israel',findCity:'Tel Aviv',findSearchedAt:'2026-11-26T10:00:00.000Z'});
 assert.equal(readPublicSearchHandoff(params).profile.lastSearchedAt,'2026-11-26T10:00:00.000Z');
 params.set('findSearchedAt','invalid');assert.equal(readPublicSearchHandoff(params).profile.lastSearchedAt,undefined);
 params.delete('findSearchedAt');assert.equal(readPublicSearchHandoff(params).profile.lastSearchedAt,undefined);
});
