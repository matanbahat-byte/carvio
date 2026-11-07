import test from 'node:test';
import assert from 'node:assert/strict';
import {messageFollowUpTarget,followUpDate,captureReviewAction,captureStageChange} from '../lib/message-follow-up.ts';
test('contact outreach plans against its explicit contact, even when an application is linked',()=>{
 assert.deepEqual(messageFollowUpTarget({contactId:'c',applicationId:'a'},['c'],['a']),{kind:'contact',id:'c'});
});
test('application-only outreach uses its explicit application; missing context never guesses',()=>{
 assert.deepEqual(messageFollowUpTarget({applicationId:'a'},[],['a']),{kind:'application',id:'a'});
 assert.equal(messageFollowUpTarget(null,['c'],['a']),null);
 assert.equal(messageFollowUpTarget({contactId:'deleted'},['c'],['a']),null);
});
test('follow-up date retains local calendar day across month boundaries without mutating clock',()=>{
 const now=new Date(2026,9,29,0,15); const before=now.getTime();
 assert.equal(followUpDate(now),'2026-11-05'); assert.equal(now.getTime(),before);
});

test('captured jobs swap their old review default for a dated follow-up when applied', () => {
 const now = new Date(2026, 10, 7, 12);
 const application = {status: 'Considering', capturedAt: now.toISOString(), nextStep: captureReviewAction('en'), nextStepDue: ''};
 assert.deepEqual(captureStageChange(application, 'Applied', 'he', now), {
  nextStep: 'לבדוק אם התקבלה תשובה למועמדות',
  nextStepDue: '2026-11-14',
 });
 assert.equal(captureStageChange({...application, status: 'Applied', nextStepDue: '2026-11-19'}, 'Applied', 'en', now).nextStepDue, '2026-11-19');
 assert.deepEqual(captureStageChange(application, 'Interview', 'en', now), {});
 assert.deepEqual(captureStageChange({...application, captureNextStepEdited: true}, 'Applied', 'en', now), {});
 assert.deepEqual(captureStageChange({...application, nextStep: 'Ask the recruiter about timing'}, 'Applied', 'en', now), {});
 assert.deepEqual(captureStageChange({...application, capturedAt: ''}, 'Applied', 'en', now), {});
});
