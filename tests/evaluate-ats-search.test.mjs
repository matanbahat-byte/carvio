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
 for (const unsafe of ['http://example.org/job/9','https://user:pass@example.org/job/9','not-a-url']) {
  const results=base.map(r=>({...r})); results[9].url=unsafe;
  const score=evaluateQuery({name:'unsafe URL',results});
  assert.equal(score.precisionAt10,null);
  assert.equal(score.usablePrecisionAt10,null);
  assert.equal(score.invalidJobUrls,1);
 }
});
