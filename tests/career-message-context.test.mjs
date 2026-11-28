import test from 'node:test';
import assert from 'node:assert/strict';
import {savedCareerMessageFields,careerCvOptions} from '../lib/career-message-context.ts';

test('saved career context prefers job-specific evidence and role',()=>{
 const profile={name:' Dana ',targetRole:'HR Director',professionalSummary:'Built global HR teams'};
 assert.deepEqual(savedCareerMessageFields(profile,{role:'VP People',evidence:'Led a global hiring program'}),{senderName:'Dana',role:'VP People',value:'Led a global hiring program'});
 assert.deepEqual(savedCareerMessageFields(profile,{role:'VP People'}),{senderName:'Dana',role:'VP People',value:'Built global HR teams'});
 assert.deepEqual(savedCareerMessageFields({}),{senderName:'',role:'',value:''});
});
test('CV choices are explicit short excerpts, not contact details or duplicates',()=>{
 assert.deepEqual(careerCvOptions('• Led a global recruiting team\nDana@example.com\nLed a global recruiting team\nPhone: +972 555 555 555\nhttps://example.com/profile\nShort'),['Led a global recruiting team']);
});
