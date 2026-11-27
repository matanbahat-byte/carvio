import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalRoleInput,isExecutiveHrSearch,matchesExecutiveHrTitle} from '../lib/role-intent.ts';
import {emptySearchProfile,jobSearchSources,linkedInRoleTerms,sanitizeSearchProfile} from '../lib/job-search.ts';
import {selectRadarJobs} from '../lib/job-radar-selection.ts';
test('VP HR shorthand, punctuation, Hebrew and equivalent titles keep executive HR intent',()=>{
 for(const role of ['vphr','VP HR','vp  hr','VP, HR','Vice-President of Human Resources','VP People','סמנכ״ל משאבי אנוש','סמנכ״לית משאבי אנוש']){
  assert.equal(isExecutiveHrSearch(role),true,role);assert.equal(canonicalRoleInput(role),'VP HR');assert.equal(sanitizeSearchProfile({...emptySearchProfile,role}).role,'VP HR');assert.ok(linkedInRoleTerms(role).includes('VP HR'));
 }
 for(const role of ['VP Sales','VP Product','HR Manager','HRBP','HR Director','CHRO'])assert.equal(isExecutiveHrSearch(role),false,role);
});
test('provider links contain complete quoted HR titles, never bare VP OR HR or compressed vphr',()=>{
 for(const role of ['VP HR','vphr','סמנכ״לית משאבי אנוש'])for(const source of jobSearchSources({...emptySearchProfile,role,country:'Israel',location:'Tel Aviv'})){
  assert.match(source.query,/"VP HR"/);assert.match(source.query,/"VP Human Resources"/);assert.doesNotMatch(source.query,/vphr|\bVP OR HR\b|VP Sales|VP Product|HR Director|Recruitment Manager/i);
  if(source.id==='linkedin')assert.equal(new URL(source.url).searchParams.get('keywords'),source.query);
 }
});
test('title matching ignores HR in company names and excludes lower ranks and other VP functions',()=>{
 for(const title of ['VP HR','VP, HR','Vice President of Human Resources','Global VP People','סמנכ״לית משאבי אנוש','VP People & Culture'])assert.equal(matchesExecutiveHrTitle(title),true,title);
 for(const title of ['VP Sales | Business Development & Growth','VP Product','סופרוויזרית','HR Director','HR Manager','Recruitment Manager','VP HR Software Sales','VP People Analytics','VP HRBP'])assert.equal(matchesExecutiveHrTitle(title),false,title);
});
test('Job Radar selects executive HR titles only from fresh approved fixture boards',()=>{
 const board={provider:'greenhouse',token:'fixture',company:'Fictional HR Experts'};const now=new Date('2026-11-29T07:00:00Z');
 const titles=['VP HR','VP Sales','VP Product','HR Manager','HR Director','Vice President of Human Resources','VP People'];
 const result=selectRadarJobs({subscription:{enabled:true,consentVersion:'job-radar-v1',preferences:{role:'vphr',country:'Israel',city:'Tel Aviv',seniority:''}},sent:[],now,approvedBoards:[{board,permissionReference:'fixture-only'}],snapshots:[{board,fetchedAt:now.toISOString(),payload:{jobs:titles.map((title,i)=>({id:i+1,title,location:{name:'Tel Aviv, Israel'},absolute_url:`https://boards.greenhouse.io/fixture/jobs/${i+1}`,first_published:'2026-11-28'}))}}]});
 assert.deepEqual(result.jobs.map(j=>j.title).sort(),['VP HR','VP People','Vice President of Human Resources'].sort());
});
