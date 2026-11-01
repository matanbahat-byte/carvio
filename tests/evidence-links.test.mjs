import test from 'node:test';
import assert from 'node:assert/strict';
import {relinkEvidence,evidenceForRequirements} from '../lib/evidence-links.ts';
const evidence={id:'e',applicationId:'a',text:'Only supplied experience',requirementIds:['r1']};
const requirements=[{id:'r1'},{id:'r2'},{id:'ignored',ignored:true}];
test('display resolves links by ID without persisting copies or counting duplicate notes',()=>{
 const rows=[{id:'r1',evidence:''},{id:'r2',evidence:evidence.text}];const before=JSON.stringify(rows);
 const item={...evidence,requirementIds:['r1','r2']};
 const result=evidenceForRequirements(rows,[item],'a');
 assert.equal(result[0].evidence,evidence.text);assert.equal(result[1].evidence,evidence.text);assert.equal(JSON.stringify(rows),before);
 assert.equal(evidenceForRequirements(rows,[item],'b')[0].evidence,'');
 assert.equal(evidenceForRequirements(rows,[{...item,requirementIds:[]}],'a')[0].evidence,'');
});
test('reusing evidence creates explicit links without duplicating text or mutating inputs',()=>{
 const items=[evidence];const before=JSON.stringify(items);
 const result=relinkEvidence(items,'a','e',['r1','r2','r2','unknown','ignored'],requirements);
 assert.deepEqual(result[0].requirementIds,['r1','r2']);assert.equal(result.length,1);assert.equal(result[0].text,evidence.text);assert.equal(JSON.stringify(items),before);
});
test('unlinking all keeps the original evidence and unrelated records',()=>{
 const other={...evidence,id:'other',applicationId:'b'};
 const result=relinkEvidence([evidence,other],'a','e',[],requirements);
 assert.deepEqual(result[0].requirementIds,[]);assert.equal(result[0].text,evidence.text);assert.strictEqual(result[1],other);
});
test('cross-application evidence is never modified',()=>{
 const result=relinkEvidence([evidence],'wrong','e',['r2'],requirements);
 assert.strictEqual(result[0],evidence);
});
