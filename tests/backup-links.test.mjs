import test from 'node:test';
import assert from 'node:assert/strict';
import {validApplicationLinks} from '../lib/backup-links.ts';
const valid={id:'a',status:'Applied',requirementEvidence:[{id:'r',requirement:'Reporting',evidence:''}],evidenceItems:[{id:'e',applicationId:'a',text:'Supplied experience',requirementIds:['r']}],linkedContactIds:['c'],linkedResumeId:'cv'};
test('legacy backups without new link fields remain valid and unmodified',()=>{
 const legacy={company:'QA',role:'QA role',status:'Applied',source:'Original source',requirementEvidence:[{requirement:'Reporting',evidence:'Legacy note'}]};
 const before=JSON.stringify(legacy);assert.equal(validApplicationLinks(legacy),true);assert.equal(JSON.stringify(legacy),before);
});
test('valid structured links survive JSON roundtrip including unlinked saved evidence',()=>{
 assert.equal(validApplicationLinks(JSON.parse(JSON.stringify(valid))),true);
 assert.equal(validApplicationLinks({...valid,evidenceItems:[{...valid.evidenceItems[0],requirementIds:[]}]}),true);
 assert.equal(validApplicationLinks({...valid,evidenceItems:[{...valid.evidenceItems[0],requirementIds:['deleted-id']}]}),true);
});
test('malformed links are rejected before restoration rather than coerced or partially applied',()=>{
 for(const evidenceItems of [null,{},[null],[{...valid.evidenceItems[0],text:42}],[{...valid.evidenceItems[0],requirementIds:'r'}],[{...valid.evidenceItems[0],requirementIds:[42]}],[{...valid.evidenceItems[0],applicationId:'other'}],[valid.evidenceItems[0],valid.evidenceItems[0]]]) assert.equal(validApplicationLinks({...valid,evidenceItems}),false);
 for(const patch of [{linkedContactIds:'c'},{linkedContactIds:[null]},{linkedResumeId:42},{requirementEvidence:[{id:42,requirement:'Reporting',evidence:''}]}]) assert.equal(validApplicationLinks({...valid,...patch}),false);
});
