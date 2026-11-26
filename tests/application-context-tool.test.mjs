import test from 'node:test';import assert from 'node:assert/strict';import {applicationContextTool} from '../lib/application-context-tool.ts';
test('exact structured stages select one tool; unknown or ambiguous actions select none',()=>{
 for(const [status,expected]of [['Interview','interview'],['Offer','offer'],['Considering','cv'],['Follow-up due','followUp'],['Applied',null],['Rejected',null],['Accepted',null],['Withdrawn',null],['unknown',null]])assert.equal(applicationContextTool({status}),expected);
 assert.equal(applicationContextTool({status:'Considering',appliedDate:'2026-11-01'}),null);
 assert.equal(applicationContextTool({status:'Applied',nextStep:'Prepare for interview and follow up'}),null);
});
