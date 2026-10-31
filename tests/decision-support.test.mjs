import test from 'node:test';
import { localProductMetrics } from '../lib/decision-support.ts';
test('local activation and seven-day measurement show explicit denominators and incomplete windows',()=>{
 const event=(name,occurredAt)=>({name,occurredAt,properties:{sessionId:'test-session'}});
 const events=[event('session_started','2026-10-30T10:00:00Z'),event('opportunity_saved','2026-10-30T10:01:00Z')];
 const metrics=localProductMetrics(events,Date.parse('2026-10-30T11:00:00Z'));
 assert.equal(metrics.firstMeaningfulSeconds,60);assert.equal(metrics.activatedSessions,1);assert.equal(metrics.returnedWithinSevenDays,null);assert.equal(metrics.decisionRate,null);
 assert.equal(localProductMetrics([...events,event('message_draft_created','2026-11-01T10:00:00Z')]).returnedWithinSevenDays,true);
});
import { goalMetrics } from '../lib/decision-support.ts';
test('goal metrics count explicit assessments and company ranges, not salary expectations',()=>{
 const row={status:'Considering',role:'QA',location:'Haifa',budgetRange:'',salary:'100000',appliedDate:'',requirements:'SQL experience required'};
 const metrics=goalMetrics([row,{...row,role:'Analyst',assessedAt:'2026-10-30',requirements:'SQL reporting'}]);
 assert.equal(metrics.submitted,0);assert.equal(metrics.companyRanges,0);assert.equal(metrics.assessed,1);assert.deepEqual(metrics.recurringSkills,[{skill:'sql',count:2}]);
});
import { readinessStates } from '../lib/decision-support.ts';
test('readiness describes prerequisites without a synthetic fit percentage',()=>{
 const partial={company:'QA',role:'QA role',jobUrl:'',jobDescription:'',requirementEvidence:[]};
 assert.equal(readinessStates(partial)[0].ready,true); assert.equal(readinessStates(partial)[1].ready,false);
 const complete={...partial,jobUrl:'https://example.com',jobDescription:'A saved role description',requirementEvidence:[{evidence:'A concrete saved example'}]};
 assert.equal(readinessStates(complete).every(item=>item.ready),true);assert.equal(readinessStates(complete).some(item=>'score' in item),false);
});
import { isCompatibleRecord } from '../lib/decision-support.ts';
test('partial legacy records are accepted, malformed values rejected before restore writes',()=>{
 const defaults={company:'',role:'',status:'Considering',details:{text:''},items:[]};
 assert.equal(isCompatibleRecord({company:'QA',status:'Applied',legacy:'preserved'},defaults),true);
 for(const value of [null,[],{company:42},{items:'bad'},{details:null}]) assert.equal(isCompatibleRecord(value,defaults),false);
 const value={company:'QA'}; isCompatibleRecord(value,defaults);assert.deepEqual(value,{company:'QA'});
});
import { aiEvidenceBullet } from '../lib/decision-support.ts';
test('AI evidence requires concrete fields and explicit requirement IDs; never invents numbers',()=>{
  const input={task:'analysis of customer feedback',tool:'a generative AI tool',judgment:'validating themes manually',outcome:'clearer product priorities'};
  assert.equal(aiEvidenceBullet(input,[],'en'),''); assert.equal(aiEvidenceBullet({...input,judgment:''},['req-1'],'en'),'');
  const bullet=aiEvidenceBullet(input,['req-1'],'en'); assert.ok(bullet.includes(input.judgment)); assert.equal(/\d/.test(bullet),false); assert.equal(bullet.includes('expert'),false);
});
import { generateOutreachMessage } from '../lib/decision-support.ts';
test('all template tones preserve standalone claims and block anchorless drafts',()=>{
  const p={recipientType:'Recruiter',intent:'Introduce myself',recipientName:'Dana',recipientEmail:'',company:'QA',role:'Designer',senderName:'Tester',context:'We discussed your design team',value:'I simplify complex reporting'};
  for(const tone of ['Warm & professional','Direct & confident','Friendly & concise','Senior & strategic']) for(const language of ['en','he']) {
    const message=generateOutreachMessage({...p,tone},language);
    assert.ok(message.includes('I simplify complex reporting.'));
    assert.equal(/includes I|contribute I|bring I|experience in I/.test(message),false);
    assert.equal(message.includes('strong match'),false);
  }
  assert.equal(generateOutreachMessage({...p,tone:'Warm & professional',context:'',value:''},'en'),'');
});
import assert from 'node:assert/strict';
import {normalizeUsageIntent,goalAction,migrateSource,sourceOutcomes,hasPersonalAnchor,valueSentence,linkContactIds,privateEventProperties,safeSourceUrl} from '../lib/decision-support.ts';
test('all five goals and legacy intent migration are deterministic',()=>{
  for (const [old,next,action] of [['active','active_search','opportunity'],['improving','better_role','target'],['market','market_exploration','scan'],['networking','networking_focus','connection'],['skip','unspecified','opportunity']]) {
    assert.equal(normalizeUsageIntent(old),next); assert.equal(normalizeUsageIntent(next),next); assert.equal(goalAction(next),action);
  }
  for(const invalid of [null,undefined,{},'unknown']) assert.equal(normalizeUsageIntent(invalid),'unspecified');
});
test('source migration preserves legacy text, URL and existing application status',()=>{
  const old={source:'Private board name',jobUrl:'https://example.com/role',status:'Applied'};
  const next={...old,...migrateSource(old)};
  assert.equal(next.source,old.source); assert.equal(next.sourceType,'Other'); assert.equal(next.sourceUrl,old.jobUrl); assert.equal(next.status,'Applied');
  assert.equal(migrateSource({source:'Referral'}).sourceType,'Referral');
  assert.equal(safeSourceUrl('javascript:alert(1)'), '');
});
test('source outcomes exclude Considering and require five submitted records for a rate',()=>{
  const rows=[{source:'LinkedIn',status:'Considering',appliedDate:'2026-01-01'},{source:'LinkedIn',status:'Interview'}];
  assert.deepEqual(sourceOutcomes(rows)[0],{source:'LinkedIn',opportunities:2,submitted:1,interviews:1,rate:null});
  const five=[...rows,...Array.from({length:4},()=>({source:'LinkedIn',status:'Applied'}))];
  assert.equal(sourceOutcomes(five)[0].rate,1/5); assert.deepEqual(sourceOutcomes([]),[]);
});
test('personal anchors and independent value sentences never fabricate claims',()=>{
  assert.equal(hasPersonalAnchor({context:'',value:''}),false);
  assert.equal(hasPersonalAnchor({context:'We discussed the new design team',value:''}),true);
  assert.equal(valueSentence('I simplify reporting','en'),'I simplify reporting.');
  assert.equal(valueSentence('HR leadership','en'),'Relevant experience: HR leadership.');
});
test('link/unlink use IDs, deduplicate and do not mutate source data',()=>{
  const original=['a']; assert.deepEqual(linkContactIds(original,'a',true),['a']); assert.deepEqual(linkContactIds(original,'b',true),['a','b']); assert.deepEqual(linkContactIds(original,'a',false),[]); assert.deepEqual(original,['a']);
});
test('analytics never store company names, emails, CVs or draft content',()=>{
  assert.deepEqual(privateEventProperties({company:'Private',email:'x@y.com',draft:'private',status:'Applied',days:2}),{status:'Applied',days:2});
});
