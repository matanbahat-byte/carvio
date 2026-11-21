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
 assert.equal(score.locationAccuracy,1);
 assert.equal(score.seniorityAccuracy,0.8);
 assert.equal(score.linksVerified,9);
 assert.equal(score.linksFailed,1);
 assert.equal(score.sourcesCount,2);
});
