import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeJobResults, publicJobUrl, deduplicateJobResults, jobMatchExplanation, postedAgeDays } from '../lib/job-results.ts';
import { emptySearchProfile } from '../lib/job-search.ts';
import { providerSearchQuery, fetchProviderJobs } from '../lib/job-results-provider.ts';
import { createJobSearchService, parseJobSearchInput } from '../lib/job-results-service.ts';
import { JobResultCards } from '../components/job-result-cards.ts';

const profile={...emptySearchProfile,role:'Data Analyst',country:'Israel',location:'Haifa',skills:'SQL, R',skillsMode:'required',exclude:'internship',alternativeRoles:'Business Analyst'};
const payload={jobs_results:[{job_id:'demo-one',title:'Senior Data Analyst',company_name:'Fictional Company',location:'Haifa, Israel',description:'SQL and ERP experience. Regular role.',detected_extensions:{posted_at:'2 days ago',schedule_type:'Full-time'},apply_options:[{title:'Spoofed label',link:'https://www.linkedin.com/jobs/view/123456/'},{title:'Company careers',link:'https://jobs.lever.co/fictional/abc'}]}]};
const job=()=>normalizeJobResults(payload)[0];

test('provider normalization uses actual safe application links and hostname-based source names',()=>{
 const jobs=normalizeJobResults(payload); assert.equal(jobs.length,1);assert.equal(jobs[0].sources[0].name,'LinkedIn');assert.equal(jobs[0].sources[1].name,'jobs.lever.co');assert.equal(jobs[0].remote,null);assert.equal(jobs[0].postedAt,'2 days ago');
 assert.deepEqual(normalizeJobResults({jobs_results:[{title:'Role',company_name:'Company',share_link:'https://google.com/search?q=role'}]}),[]);
 assert.deepEqual(normalizeJobResults({jobs_results:[null,{},'x']}),[]);
});
test('invalid schemes, credentials, loopback/private IPs and oversized URLs are never linked',()=>{
 for(const url of ['javascript:alert(1)','http://example.com/job','https://user:secret@example.com/job','https://127.0.0.1/job','https://[::1]/job','https://localhost/job','https://host.local/job','https://example.com:8443/job','https://example.com/'+ 'a'.repeat(2100)]) assert.equal(publicJobUrl(url),null,url);
 assert.equal(publicJobUrl('https://jobs.example.com/job'),'https://jobs.example.com/job');
});
test('multi-source duplicates collapse by shared posting ID without merging similar titles',()=>{
 const original=job();const duplicate={...original,id:'another-provider-id',sources:[{name:'LinkedIn',url:'https://il.linkedin.com/jobs/view/data-analyst-at-test-123456?trk=ref'},{name:'jobs.example.com',url:'https://jobs.example.com/abc'}]};
 const separate={...original,id:'different-job',sources:[{name:'jobs.example.com',url:'https://jobs.example.com/xyz'}]};
 const result=deduplicateJobResults([original,duplicate,separate]);assert.equal(result.length,2);assert.equal(result.find(j=>j.sources.length>1).sources.length,3);
});
test('explanations distinguish evidence, absent requirements and unknown location without a fit percentage',()=>{
 const match=jobMatchExplanation(job(),profile);assert.equal(match.title,'Data Analyst');assert.deepEqual(match.matchedSkills,['SQL']);assert.deepEqual(match.missingRequiredSkills,['R']);assert.equal(match.locationMatch,true);assert.deepEqual(match.excluded,[]);
 assert.deepEqual(jobMatchExplanation({...job(),description:'ERP skills, internship'},profile).matchedSkills,[]);assert.deepEqual(jobMatchExplanation({...job(),description:'internship'},profile).excluded,['internship']);
});
test('query combines title alternatives while excluding preferred skills and preserving mandatory constraints',()=>{
 const query=providerSearchQuery(profile);assert.match(query,/"Data Analyst" OR "Business Analyst"/);assert.match(query,/"SQL"/);assert.match(query,/-"internship"/);
 assert.doesNotMatch(providerSearchQuery({...profile,skillsMode:'preference'}),/SQL/);
});
test('input is bounded, ignores extra private fields and does not mutate the caller',()=>{
 const input={profile:{...profile,email:'private@example.com'},language:'he'};const before=JSON.stringify(input);const parsed=parseJobSearchInput(input);
 assert.equal(parsed.language,'he');assert.equal(parsed.profile.email,undefined);assert.equal(JSON.stringify(input),before);
 for(const value of [null,{}, {profile:[]},{profile:{...profile,role:''}},{profile:{...profile,skills:[]}}, {profile:{...profile,role:'x'.repeat(121)}},{profile:{...profile,role:'A\nB'}}]) assert.equal(parseJobSearchInput(value),null);
});
test('provider fetch uses only the fixed endpoint, does not follow redirects, and fails closed',async()=>{
 let request;
 const fetched=await fetchProviderJobs(profile,'he','test-secret',async(url,options)=>{request={url,options};return new Response(JSON.stringify(payload));});
 const url=new URL(request.url);assert.equal(url.origin,'https://serpapi.com');assert.equal(url.searchParams.get('engine'),'google_jobs');assert.equal(url.searchParams.get('location'),'Haifa, Israel');assert.equal(request.options.redirect,'error');assert.equal(fetched.length,1);
 await assert.rejects(()=>fetchProviderJobs(profile,'en','test-secret',async()=>new Response('{}',{status:429})),/Provider unavailable/);
 await assert.rejects(()=>fetchProviderJobs(profile,'en','test-secret',async()=>new Response('{"error":"quota exhausted"}')),/Provider unavailable/);
});
test('service caches and coalesces identical requests without sending identity to the provider',async()=>{
 let calls=0;let finish;
 const service=createJobSearchService({fetcher:async()=>{calls++;await new Promise(resolve=>{finish=resolve});return new Response(JSON.stringify(payload));}});
 const one=service('user-one',profile,'en','test-secret');const two=service('user-two',profile,'en','test-secret');finish();
 assert.equal((await one).status,'ready');assert.equal((await two).status,'ready');assert.equal((await service('user-three',profile,'en','test-secret')).status,'ready');assert.equal(calls,1);
});
test('service request allowance limits repeated searches and provider failures are not disguised as empty results',async()=>{
 const service=createJobSearchService({fetcher:async()=>{throw Error('secret provider error')}});
 for(let i=0;i<6;i++) assert.equal((await service('same-user',profile,'en','test-secret')).status,'unavailable');
 assert.equal((await service('same-user',profile,'en','test-secret')).status,'limited');
});
test('result cards show real source choices, required-skill gaps and already-saved state in both languages',()=>{
 for(const language of ['he','en']){
  const html=renderToStaticMarkup(createElement(JobResultCards,{jobs:[job()],profile,language,savedUrls:['https://il.linkedin.com/jobs/view/analyst-at-example-123456?trk=qa'],onReview:()=>{}}));
  assert.match(html,/LinkedIn/);assert.match(html,/jobs.lever.co/);assert.match(html,/noopener noreferrer/);assert.ok(html.includes(language==='he'?'כבר שמורה אצלכם':'Already saved'));assert.ok(html.includes(language==='he'?'כישורים נדרשים שלא נמצאו':'Required skills not found'));assert.doesNotMatch(html,/\d+%/);
 }
});
test('relative posting dates retain uncertainty for missing or unrecognized values',()=>{
 assert.equal(postedAgeDays('2 days ago'),2);assert.equal(postedAgeDays('6 hours ago'),0.25);assert.equal(postedAgeDays('today'),0);assert.equal(postedAgeDays(''),null);assert.equal(postedAgeDays('אתמול'),null);
});
