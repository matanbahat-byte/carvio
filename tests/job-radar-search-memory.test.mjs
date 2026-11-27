import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySearchProfile} from '../lib/job-search.ts';
import {radarSearchFromProfile,radarSearchSummary,nextRadarSearchUpdate} from '../lib/job-radar-search-memory.ts';
import {renderRadarEmail} from '../lib/job-radar-email.ts';
import {radarDispatchFixture} from './fixtures/job-radar-dispatch.mjs';
const profile={...emptySearchProfile,role:'  Recruitment Manager ',country:' Israel ',location:' Tel Aviv ',workModel:'Hybrid',seniority:'Manager',employmentType:'Full-time',lastSearchedAt:'2026-11-27T18:00:00Z'};
const saved={role:'Old role',country:'Israel',city:'',workModel:'',seniority:'',employmentType:''};
const input={profile,saved,enabled:true,successfulSearch:true,lastSearchAt:'2026-11-26T18:00:00Z',expectedVersion:'2026-11-26T18:00:00Z',now:Date.parse('2026-11-27T18:01:00Z')};
test('completed search carries exactly six normalized email criteria, no incidental profile fields',()=>{
 const next=nextRadarSearchUpdate(input);assert.equal(next.preferences.city,'Tel Aviv');assert.equal(next.preferences.role,'Recruitment Manager');assert.equal(Object.keys(next.preferences).length,6);assert.equal(next.expectedVersion,input.expectedVersion);assert.doesNotMatch(JSON.stringify(next),/skills|radius|lastSearchedAt/);
});
test('guest/no opt-in, paused alerts, merely edited fields, incomplete and old searches never update alerts',()=>{
 for(const patch of [{enabled:false},{successfulSearch:false},{saved:null},{expectedVersion:null},{lastSearchAt:profile.lastSearchedAt},{profile:{...profile,lastSearchedAt:undefined}},{profile:{...profile,role:''}},{profile:{...profile,country:''}},{profile:{...profile,role:'x'.repeat(121)}},{profile:{...profile,lastSearchedAt:'2099-01-01'}}])assert.equal(nextRadarSearchUpdate({...input,...patch}),null);
});
test('a manual alert edit newer than the submitted search wins even with an older search timestamp',()=>{
 assert.equal(nextRadarSearchUpdate({...input,expectedVersion:'2026-11-27T18:00:30Z'}),null);
 assert.equal(nextRadarSearchUpdate({...input,saved:radarSearchFromProfile(profile)}),null);
});
test('saved criteria appear in both Hebrew and English emails with safe HTML escaping',()=>{
 const jobs=[{id:'greenhouse:fixture:1',title:'Recruitment Manager',company:'Fixture only',location:'Tel Aviv, Israel',url:'https://boards.greenhouse.io/fixture/jobs/1',provider:'greenhouse',postedAt:'2026-11-26'}];
 for(const language of ['he','en']){
  const search={...saved,role:'HR <script>alert(1)</script>',city:'Tel Aviv',seniority:'Director',workModel:'Hybrid',employmentType:'Full-time'};
  const message=renderRadarEmail({jobs,language,search});assert.ok(message);assert.ok(message.text.includes(radarSearchSummary(search)));assert.match(message.html,/&lt;script&gt;/);assert.doesNotMatch(message.html,/<script>/);assert.match(message.html,/Hybrid/);assert.match(message.html,/Full-time/);
 }
});
test('unsupported source filters are never silently discarded to produce email matches',async()=>{
 const fixture=radarDispatchFixture();
 for(const filter of [{workModel:'Hybrid'},{employmentType:'Full-time'}]){
  const f=radarDispatchFixture({subscription:{preferences:{...fixture.subscription.preferences,...filter}}});
  const result=await f.run();assert.equal(result.status,'skipped');assert.equal(result.code,'saved_filters_require_source_evidence');assert.equal(f.counts().sends,0);
 }
});
