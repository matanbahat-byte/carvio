import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRadarJobs } from '../lib/job-radar-selection.ts';
const now = new Date('2026-11-27T09:00:00Z');
const board = {provider:'greenhouse',token:'fixture',company:'Fixture only'};
const job = (id, patch={}) => ({id,title:'Recruitment Manager',location:{name:'Tel Aviv, Israel'},absolute_url:`https://boards.greenhouse.io/fixture/jobs/${id}`,first_published:'2026-11-26T00:00:00Z',...patch});
const base = {subscription:{enabled:true,consentVersion:'job-radar-v1',preferences:{role:'מנהלת גיוס',country:'ישראל',city:'תל אביב',seniority:''}},sent:[],now,approvedBoards:[{board,permissionReference:'fixture-only'}]};
const run = (jobs, patch={}) => selectRadarJobs({...base,snapshots:[{board,fetchedAt:now.toISOString(),payload:{jobs}}],...patch});
test('production defaults block unapproved sources and never return search links',()=>{
 assert.deepEqual(run([job(1)],{approvedBoards:undefined}).blockers,['no_authorized_source']);
 assert.equal(run([job(1,{absolute_url:'https://linkedin.com/jobs/search/?keywords=HR'})]).jobs.length,0);
});
test('Hebrew preferences match English equivalent titles and locations; capped at five',()=>{
 const result=run(Array.from({length:8},(_,i)=>job(i+1,{title:i%2?'Talent Acquisition Manager':'מנהלת גיוס'})));
 assert.equal(result.jobs.length,5);
 assert.equal(run([job(1)],{subscription:{...base.subscription,preferences:{role:'Recruitment Manager',country:'Israel',city:'Tel Aviv',seniority:''}}}).jobs.length,1);
});
test('excludes wrong country, city, role, seniority, expired dates, unknown dates and future dates',()=>{
 const invalid=[job(1,{location:{name:'Tel Aviv, Germany'}}),job(2,{location:{name:'Haifa, Israel'}}),job(3,{title:'Product Manager'}),job(4,{title:'Senior Recruitment Manager'}),job(5,{first_published:'2026-10-01'}),job(6,{first_published:null}),job(7,{first_published:'2026-12-01'}),job(8,{location:{name:'Tel Aviv'}})];
 assert.equal(run(invalid).jobs.length,0);
});
test('uses latest active board snapshot and rejects stale, malformed or failed sources',()=>{
 assert.equal(run([job(1)],{snapshots:[{board,fetchedAt:'2026-11-27T08:00:00Z',payload:{jobs:[job(1)]}}]}).jobs.length,0);
 assert.equal(run([job(1)],{snapshots:[{board,fetchedAt:now.toISOString(),payload:null}]}).jobs.length,0);
 assert.equal(run([]).jobs.length,0);
});
test('deduplicates tracked postings and sent IDs or canonical URLs',()=>{
 const result=run([job(1),job(1,{absolute_url:'https://boards.greenhouse.io/fixture/jobs/1?utm_source=x'}),job(2),job(3)],{sent:[{id:'greenhouse:fixture:2',url:'https://example.org/jobs/2'},{id:'old-id',url:'https://boards.greenhouse.io/fixture/jobs/3?source=email'}]});
 assert.deepEqual(result.jobs.map(j=>j.id),['greenhouse:fixture:1']);
});
test('missing consent or history fails closed, histories are per user',()=>{
 assert.equal(run([job(1)],{subscription:{...base.subscription,enabled:false}}).jobs.length,0);
 assert.equal(run([job(1)],{sent:null}).jobs.length,0);
 assert.equal(run([job(1)],{sent:[{id:'greenhouse:fixture:1',url:'https://boards.greenhouse.io/fixture/jobs/1'}]}).jobs.length,0);
 assert.equal(run([job(1)]).jobs.length,1);
});
