import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSearchSharePath} from '../lib/job-search.ts';
test('shared search carries exactly three encoded criteria and no account or timing data',()=>{
 for(const [role,country,city] of [['Software Engineer','Israel','Tel Aviv'],['מנהל משאבי אנוש','ישראל','באר שבע'],['R&D & Product','United States','New York'],['Engineer&account=private','Israel','']]){
  const url=new URL(publicSearchSharePath(role,country,city),'https://carvio.example');
  assert.equal(url.pathname,'/find');assert.deepEqual([...url.searchParams.keys()],['q','country','city']);
  assert.equal(url.searchParams.get('q'),role);assert.equal(url.searchParams.get('country'),country);assert.equal(url.searchParams.get('city'),city);assert.equal(url.hash,'#search-sources');
 }
});
