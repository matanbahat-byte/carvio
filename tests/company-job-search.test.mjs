import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCompanyGeography,selectCompanyJobs,searchCompanyJobs} from '../lib/company-job-search.ts';
import {verifiedCompanySearchUrl,emptySearchProfile} from '../lib/job-search.ts';
const board={provider:'greenhouse',token:'sample',company:'Sample'};
const now=new Date('2026-11-27T21:00:00Z');
const p={role:'VP HR',country:'Israel',location:'Tel Aviv',radius:''};
const record=(id=1,patch={})=>({id,internal_job_id:100+id,title:'VP HR',location:{name:'Tel Aviv'},offices:[{location:'Tel Aviv, Israel'}],absolute_url:`https://job-boards.greenhouse.io/sample/jobs/${id}`,...patch});
const select=(records,criteria=p)=>selectCompanyJobs(board,{jobs:records},criteria,now);
test('country is required from location/associated office, never company description or HQ',()=>{
 assert.equal(select([record()]).length,1);
 for(const location of ['Tel Aviv','Remote','London, United Kingdom','Austin, Texas, United States'])assert.equal(select([record(1,{location:{name:location},offices:[],content:'Our headquarters are in Israel'})]).length,0,location);
 assert.equal(select([record(1,{location:{name:'London'},offices:[{location:'Tel Aviv, Israel'}]})]).length,0);
 assert.equal(select([record(1,{location:{name:'Remote'},offices:[{location:'Tel Aviv, Israel'}]})],{...p,location:''}).length,0);
 assert.equal(select([record(1,{location:{name:'Remote, Israel'},offices:[]})],{...p,location:''}).length,1);
 assert.equal(select([record()],{...p,country:'Germany'}).length,0);
});
test('city aliases and conservative radius never override country; unsupported expansion fails closed',()=>{
 assert.equal(matchesCompanyGeography('Tel Aviv, Israel',{...p,location:'תל אביב'}),true);
 assert.equal(matchesCompanyGeography('Herzliya, Israel',p),false);
 assert.equal(matchesCompanyGeography('Herzliya, Israel',{...p,radius:'25'}),true);
 assert.equal(matchesCompanyGeography('Herzliya, Israel',{...p,radius:'5'}),false);
 assert.equal(matchesCompanyGeography('Tel Aviv, United States',{...p,radius:'200'}),false);
 assert.equal(matchesCompanyGeography('London, United Kingdom',{...p,location:'Manchester',country:'United Kingdom',radius:'200'}),false);
});
test('closed deadlines, talent pools, incorrect roles and invalid listing URLs are excluded',()=>{
 const jobs=select([record(),record(2,{application_deadline:'2026-11-26'}),record(3,{application_deadline:'invalid'}),record(4,{internal_job_id:null}),record(5,{title:'HR Manager reporting to VP HR'}),record(6,{absolute_url:'https://example.com/jobs/6'})]);
 assert.deepEqual(jobs.map(j=>j.id),['greenhouse:sample:1']);assert.equal(jobs[0].matchedLocation,'Tel Aviv, Israel');
});
test('published list is followed by a fresh detail check and closed/unknown details fail closed',async()=>{
 let closed=false,fail=false;const urls=[];
 const request=async(url,options)=>{urls.push(url);assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');if(fail)throw Error('offline');return Response.json(url.includes('/jobs/1?')?(closed?{id:1,title:'VP HR',application_deadline:'2020-01-01'}:record()):{jobs:[record()]});};
 assert.equal((await searchCompanyJobs(p,request,now,[board])).jobs.length,1);
 assert.ok(urls.some(u=>u.endsWith('/jobs/1?content=true')));
 closed=true;assert.equal((await searchCompanyJobs(p,request,now,[board])).jobs.length,0);
 fail=true;const unavailable=await searchCompanyJobs(p,request,now,[board]);assert.equal(unavailable.jobs.length,0);assert.equal(unavailable.unavailable,1);
});
test('removed posting never survives a new search or open recheck; requested job is not lost to result cap',async()=>{
 let removed=false;const jobs=Array.from({length:20},(_,i)=>record(i+1));
 const request=async url=>Response.json(url.includes('/jobs/20?')?record(20):{jobs:removed?[]:jobs});
 assert.equal((await searchCompanyJobs(p,request,now,[board],'greenhouse:sample:20')).jobs[0].id,'greenhouse:sample:20');
 removed=true;assert.equal((await searchCompanyJobs(p,request,now,[board],'greenhouse:sample:20')).jobs.length,0);
});
test('employer link preserves selected country city radius and language without using Google',()=>{
 const u=new URL(verifiedCompanySearchUrl({...emptySearchProfile,...p,location:'תל אביב',radius:'25'},'he'),'https://carvio.test');
 assert.equal(u.pathname,'/company-jobs');assert.equal(u.searchParams.get('country'),'Israel');assert.equal(u.searchParams.get('city'),'תל אביב');assert.equal(u.searchParams.get('radius'),'25');assert.equal(u.searchParams.get('lang'),'he');
});
