import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateQuery } from '../scripts/evaluate-ats-search.mjs';

test('unreviewed and underfilled samples never claim Precision@10',()=>{
 const result=evaluateQuery({name:'Supply Chain Director Israel',results:[
  {id:'1',url:'https://example.org/1',provider:'lever',relevant:true},
  {id:'1',url:'https://example.org/1',provider:'lever'}
 ]});
 assert.equal(result.precisionAt10,null);
 assert.equal(result.duplicateIds,1);
 assert.equal(result.duplicateUrls,1);
 assert.equal(result.linksNotChecked,2);
 assert.equal(result.locationAccuracy,null);
});
test('ten manually reviewed results produce an auditable Precision@10',()=>{
 const results=Array.from({length:10},(_,i)=>({
  id:String(i),url:'https://example.org/'+i,provider:i%2?'lever':'greenhouse',
  relevant:i<7,locationCorrect:true,seniorityCorrect:i<8,linkVerified:i<9
 }));
 const score=evaluateQuery({name:'Software Engineer Israel',results});
 assert.equal(score.precisionAt10,0.7);
 assert.equal(score.usablePrecisionAt10,null); // one broken link
 assert.equal(score.locationAccuracy,1);
 assert.equal(score.seniorityAccuracy,0.8);
 assert.equal(score.linksVerified,9);
 assert.equal(score.linksFailed,1);
 assert.equal(score.sourcesCount,2);
});

test('missing job identities and URLs are not counted as duplicate opportunities',()=>{
 const result=evaluateQuery({name:'HR Business Partner Israel',results:[
  {id:'',url:'',provider:'lever'},
  {provider:'greenhouse'},
  {id:'real-1',url:'https://example.org/1',provider:'lever'},
  {id:'real-1',url:'https://example.org/1',provider:'lever'}
 ]});
 assert.equal(result.duplicateIds,1);
 assert.equal(result.duplicateUrls,1);
 assert.equal(result.missingIds,2);
 assert.equal(result.missingUrls,2);
 assert.equal(result.uniqueJobIds,1);
 assert.equal(result.precisionAt10,null);
});


test('duplicate or missing top-ten identities cannot yield a misleading Precision@10',()=>{
 const base=Array.from({length:10},(_,i)=>({id:String(i+1),url:'https://example.org/job/'+(i+1),provider:'lever',relevant:true}));
 assert.equal(evaluateQuery({name:'baseline',results:base}).precisionAt10,1);
 const duplicate=base.map(r=>({...r})); duplicate[9].id=duplicate[0].id;
 assert.equal(evaluateQuery({name:'duplicate id',results:duplicate}).precisionAt10,null);
 const duplicateUrl=base.map(r=>({...r})); duplicateUrl[9].url=duplicateUrl[0].url;
 assert.equal(evaluateQuery({name:'duplicate url',results:duplicateUrl}).precisionAt10,null);
 const missing=base.map(r=>({...r})); missing[9].url='';
 assert.equal(evaluateQuery({name:'missing url',results:missing}).precisionAt10,null);
});


test('usable precision requires ten individually link-verified real postings',()=>{
 const results=Array.from({length:10},(_,i)=>({
  id:'job-'+i,url:'https://example.org/job/'+i,provider:'lever',
  relevant:i<8,linkVerified:true
 }));
 assert.equal(evaluateQuery({name:'verified',results}).usablePrecisionAt10,0.8);
 results[0].linkVerified=undefined;
 assert.equal(evaluateQuery({name:'unchecked',results}).usablePrecisionAt10,null);
 results[0].linkVerified=false;
 assert.equal(evaluateQuery({name:'broken',results}).usablePrecisionAt10,null);
});


test('unsafe or malformed top-ten job URLs cannot earn precision credit',()=>{
 const base=Array.from({length:10},(_,i)=>({id:'job-'+i,url:'https://example.org/job/'+i,provider:'lever',relevant:true,linkVerified:true}));
 for (const unsafe of ['http://example.org/job/9','https://user:pass@example.org/job/9','https://example.org:8443/job/9','not-a-url']) {
  const results=base.map(r=>({...r})); results[9].url=unsafe;
  const score=evaluateQuery({name:'unsafe URL',results});
  assert.equal(score.precisionAt10,null);
  assert.equal(score.usablePrecisionAt10,null);
  assert.equal(score.invalidJobUrls,1);
 }
});

test('external search links are never scored as retrieved job postings',()=>{
 const base=Array.from({length:10},(_,i)=>({id:'job-'+i,url:'https://example.org/job/'+i,provider:'lever',relevant:true,linkVerified:true}));
 for(const landing of ['https://www.linkedin.com/jobs/search/?keywords=engineer','https://www.linkedin.com/jobs/collections/recommended/','https://www.indeed.com/jobs?q=engineer','https://www.google.com/search?q=engineer','https://www.google.com/url?q=https%3A%2F%2Fexample.org%2Fjob%2F123']) {
  const rows=base.map(r=>({...r})); rows[9].url=landing;
  const score=evaluateQuery({name:'external landing',results:rows});
  assert.equal(score.invalidJobUrls,1);
  assert.equal(score.precisionAt10,null);
  assert.equal(score.usablePrecisionAt10,null);
 }
});


test('external search landing detection handles subdomains but not lookalike domains',()=>{
 const base=Array.from({length:10},(_,i)=>({id:'job-'+i,url:'https://example.org/job/'+i,provider:'lever',relevant:true,linkVerified:true}));
 for(const landing of ['https://linkedin.com/jobs/search?keywords=engineer','https://www.linkedin.com/jobs/search?keywords=engineer','https://uk.indeed.com/jobs?q=engineer','https://www.google.co.uk/search?q=engineer']) {
  const rows=base.map(r=>({...r})); rows[9].url=landing;
  const score=evaluateQuery({name:'landing',results:rows});
  assert.equal(score.invalidJobUrls,1,landing);
  assert.equal(score.precisionAt10,null,landing);
 }
 const rows=base.map(r=>({...r})); rows[9].url='https://notlinkedin.com/jobs/search?keywords=engineer';
 assert.equal(evaluateQuery({name:'lookalike',results:rows}).invalidJobUrls,0);
});


test('missing URLs count as invalid postings rather than disappearing from URL quality denominator',()=>{
 const score=evaluateQuery({name:'missing URL',results:[
  {id:'one',provider:'lever',relevant:true},
  {id:'two',url:'',provider:'lever',relevant:true},
  {id:'three',url:'https://example.org/jobs/3',provider:'lever',relevant:true}
 ]});
 assert.equal(score.missingUrls,2);
 assert.equal(score.invalidJobUrls,2);
 assert.equal(score.individualJobs,3);
 assert.equal(score.validIndividualJobs,1);
 assert.equal(score.precisionAt10,null);
});


test('invalid or landing URLs cannot be reported as verified links',()=>{
 const score=evaluateQuery({name:'invalid verified links',results:[
  {id:'1',url:'https://example.org/job/1',provider:'lever',linkVerified:true},
  {id:'2',url:'https://www.linkedin.com/jobs/search/?keywords=engineer',provider:'linkedin',linkVerified:true},
  {id:'3',url:'',provider:'lever',linkVerified:true}
 ]});
 assert.equal(score.linksVerified,1);
 assert.equal(score.linksFailed,2);
 assert.equal(score.linksNotChecked,0);
 assert.equal(score.validIndividualJobs,1);
});

test('source coverage excludes navigation links and distinguishes verified providers',()=>{
 const score=evaluateQuery({name:'source coverage',results:[
  {id:'1',url:'https://www.linkedin.com/jobs/search/?keywords=engineer',provider:'linkedin',linkVerified:true},
  {id:'2',url:'https://www.indeed.com/jobs?q=engineer',provider:'indeed'},
  {id:'3',url:'https://boards.greenhouse.io/acme/jobs/123',provider:'greenhouse',linkVerified:true},
  {id:'4',url:'https://jobs.lever.co/acme/abc',provider:'lever',linkVerified:false},
  {id:'5',provider:'google'}
 ]});
 assert.equal(score.sourcesCount,5);
 assert.deepEqual(score.validSources,['greenhouse','lever']);
 assert.equal(score.validSourcesCount,2);
 assert.deepEqual(score.verifiedSources,['greenhouse']);
 assert.equal(score.verifiedSourcesCount,1);
});
