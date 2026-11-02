import test from 'node:test';
import assert from 'node:assert/strict';
import {relinkEvidence,evidenceForRequirements,evidenceContext,restorableRequirementEvidence,firstApplicationEvidence} from '../lib/evidence-links.ts';
const evidence={id:'e',applicationId:'a',text:'Only supplied experience',requirementIds:['r1']};
const requirements=[{id:'r1'},{id:'r2'},{id:'ignored',ignored:true}];
test('outreach from application or explicitly linked contact resolves the same shared evidence',()=>{
 const application={id:'a',requirementEvidence:[{id:'r1',evidence:''}],evidenceItems:[evidence]};
 const before=JSON.stringify(application);
 assert.equal(firstApplicationEvidence(application),evidence.text);
 assert.equal(JSON.stringify(application),before);
 assert.equal(firstApplicationEvidence({...application,id:'b'}),'');
 assert.equal(firstApplicationEvidence({...application,evidenceItems:[{...evidence,requirementIds:['deleted']}]}),'');
 assert.equal(firstApplicationEvidence(undefined),'');
});
test('legacy outreach evidence remains available without adding a structured record',()=>{
 assert.equal(firstApplicationEvidence({id:'a',requirementEvidence:[{evidence:'  Supplied legacy experience  '}]}),'Supplied legacy experience');
});
test('restore roundtrip preserves requirement IDs and therefore saved evidence links',()=>{
 const source=[{id:'r1',requirement:'Reporting',evidence:'',category:'Communication'}];
 const restored=restorableRequirementEvidence(JSON.parse(JSON.stringify([...source,null,{requirement:42,evidence:''}])));
 assert.deepEqual(restored,source);
 assert.ok(evidenceContext(restored,[evidence],'a','en').includes(evidence.text));
 assert.equal(restored[0].id,'r1');
 assert.deepEqual(restorableRequirementEvidence([{requirement:'Legacy',evidence:''}]),[{requirement:'Legacy',evidence:''}]);
});
test('CV context includes explicitly linked evidence and keeps unsupported requirements as gaps in both languages',()=>{
 const rows=[{id:'r1',requirement:'Reporting',evidence:''},{id:'r2',requirement:'SQL',evidence:''}];
 const before=JSON.stringify(rows);
 for(const language of ['en','he']) {
  const text=evidenceContext(rows,[evidence],'a',language);
  assert.ok(text.includes(evidence.text));assert.match(text,/2\. SQL/);assert.ok(text.includes(language==='he'?'פער:':'Gap:'));
  assert.ok(!evidenceContext(rows,[evidence],'b',language).includes(evidence.text));
 }
 assert.equal(JSON.stringify(rows),before);
});
test('legacy-only CV context remains readable and empty inputs make no claims',()=>{
 assert.match(evidenceContext([{requirement:'Reporting',evidence:'Existing supplied note'}],[],'a','en'),/Existing supplied note/);
 assert.equal(evidenceContext([],[],'a','en'),'No role requirements have been saved yet.');
});
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
