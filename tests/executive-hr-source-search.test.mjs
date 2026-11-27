import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalRoleInput,isExecutiveHrSearch,matchesExecutiveHrTitle} from '../lib/role-intent.ts';
import {emptySearchProfile,jobSearchSources,linkedInRoleTerms,sanitizeSearchProfile,googleJobSearch} from '../lib/job-search.ts';
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

test('executive HR Google routes target title matches in the Web view and preserve filters',()=>{
 for(const language of ['en','he'])for(const options of [{},{anyTime:true},{careerPages:true,anyTime:true}]){
  const p={...emptySearchProfile,role:'vphr',country:'Israel',location:'Tel Aviv',skills:'SQL',skillsMode:'required',exclude:'internship'};
  const result=googleJobSearch(p,language,options);const url=new URL(result.url);
  assert.match(result.query,/intitle:"VP HR"/);assert.match(result.query,/intitle:"VP Human Resources"/);
  assert.match(result.query,/intitle:"VP People"/);assert.match(result.query,/"SQL"/);assert.match(result.query,/-"internship"/);
  assert.equal(url.searchParams.get('udm'),'web');assert.equal(url.searchParams.get('gl'),'il');
  assert.equal(url.searchParams.has('tbs'),!options.anyTime);
  if(options.careerPages)assert.match(result.query,/-site:linkedin.com/);
  else {assert.match(result.query,/site:linkedin.com\/jobs\/view\//);assert.match(result.query,/site:job-boards.greenhouse.io/);assert.doesNotMatch(result.query,/site:linkedin.com\/jobs(?:\s|\))/);}
 }
});
