import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySearchProfile,jobSearchSources,companyJobSearchRoute} from '../lib/job-search.ts';
for(const [role,city,country] of [['Software Engineer','Tel Aviv','Israel'],['מנהל משאבי אנוש','באר שבע','Israel'],['Supply Chain Manager','New York','United States']]) {
 test(`unquoted job title and spaced location: ${role}`,()=>{
  const profile={...emptySearchProfile,role,location:city,country,employmentType:'',datePosted:'Any time',radius:''};
  for(const id of ['linkedin','indeed']){
   const source=jobSearchSources(profile).find(s=>s.id===id),url=new URL(source.url);
   assert.equal(url.searchParams.get(id==='linkedin'?'keywords':'q'),role==='מנהל משאבי אנוש'?'(מנהל משאבי אנוש OR HR Manager)':role);
   assert.equal(url.searchParams.get(id==='linkedin'?'location':'l'),`${city}, ${country}`);
   if(id==='indeed')assert.equal(url.searchParams.has('jt'),false);
  }
  for(const index of [0,2]){
   const url=new URL(companyJobSearchRoute(profile,'Example Company',index).url);
   assert.equal(url.searchParams.get(index===0?'q':'keywords'),`${role} "Example Company"`);
   assert.equal(url.searchParams.get(index===0?'l':'location'),`${city}, ${country}`);
   assert.equal(url.searchParams.has('jt'),false);
  }
 });
}
test('unquoted alternatives retain required skills and exclusion phrases',()=>{
 const profile={...emptySearchProfile,role:'Software Engineer',alternativeRoles:'Software Developer',country:'Israel',location:'Tel Aviv',skills:'Data Science',skillsMode:'required',exclude:'Sales Manager',employmentType:''};
 for(const s of jobSearchSources(profile).filter(s=>s.id!=='google')){
  assert.match(s.query,/Software Engineer OR Software Developer/);
  assert.doesNotMatch(s.query,/"Software (Engineer|Developer)"/);
  assert.match(s.query,/"Data Science"/);assert.match(s.query,/"Sales Manager"/);
 }
});
