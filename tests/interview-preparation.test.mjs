import test from 'node:test';
import assert from 'node:assert/strict';
import { interviewSuggestions, appendInterviewSuggestion } from '../lib/interview-preparation.ts';

const application = { id: 'a', requirementEvidence: [
  { id: 'r1', requirement: 'Lead a team', evidence: 'Managed a team of three' },
  { id: 'r2', requirement: 'SQL', evidence: '' },
] };

test('practice suggestions use saved examples and identify missing examples without claiming missing ability', () => {
  const rows = interviewSuggestions(application, 'en');
  assert.equal(rows[0].field, 'starStories');
  assert.match(rows[0].text, /Managed a team of three/);
  assert.match(rows[0].question, /Lead a team/);
  assert.equal(rows[1].field, 'gapsToExplain');
  assert.match(rows[1].context, /No linked example is saved/);
  assert.equal(application.requirementEvidence[1].evidence, '');
});

test('only explicit links for this application provide evidence; legacy examples remain', () => {
  const rows = interviewSuggestions({ ...application, evidenceItems: [
    { id: '1', applicationId: 'a', requirementIds: ['r2'], text: 'Built a SQL report' },
    { id: '2', applicationId: 'other', requirementIds: ['r2'], text: 'PRIVATE OTHER ROLE' },
    { id: '3', applicationId: 'a', requirementIds: [], text: 'UNLINKED' },
  ] }, 'en');
  assert.match(rows[0].text, /Managed a team of three/);
  assert.match(rows[1].text, /Built a SQL report/);
  assert.doesNotMatch(JSON.stringify(rows), /PRIVATE OTHER ROLE|UNLINKED/);
});

test('no examples and no requirements have honest empty states in both languages', () => {
  for (const language of ['he', 'en']) {
    assert.deepEqual(interviewSuggestions({ id: 'a', requirementEvidence: [] }, language), []);
    const rows = interviewSuggestions({ id: 'a', requirementEvidence: [{ requirement: 'SQL', evidence: '' }] }, language);
    assert.equal(rows[0].field, 'gapsToExplain');
    assert.match(rows[0].question, /SQL/);
  }
});

test('explicit additions preserve manual content, avoid duplicates, and survive saved application reopen', () => {
  const suggestion = interviewSuggestions(application, 'en')[0];
  const manual = 'My own story\nWith intentional formatting';
  const added = appendInterviewSuggestion(manual, suggestion.text);
  assert.ok(added.startsWith(manual + '\n\n'));
  assert.equal(appendInterviewSuggestion(added, suggestion.text), added);
  const saved = JSON.parse(JSON.stringify({ ...application, interviewPreparation: { starStories: 'Edited preparation', gapsToExplain: '' } }));
  interviewSuggestions(saved, 'he');
  assert.equal(saved.interviewPreparation.starStories, 'Edited preparation');
  assert.equal(saved.interviewPreparation.gapsToExplain, '');
});

test('first-open drafts fill empty preparation fields and never replace saved or manual content',async()=>{
 const {initialInterviewPreparation}=await import('../lib/interview-preparation.ts');
 const application={id:'a',requirementEvidence:[{requirement:'SQL',evidence:'Built a verified report'},{requirement:'Python',evidence:''}]};
 const blank={starStories:'',interviewerQuestions:'',gapsToExplain:'',updatedAt:'',companyResearch:'manual research'};
 for(const language of ['he','en']){
  const first=initialInterviewPreparation(application,blank,language);assert.match(first.starStories,/Built a verified report/);assert.match(first.interviewerQuestions,/SQL/);assert.match(first.gapsToExplain,/Python/);assert.equal(first.companyResearch,'manual research');
  assert.equal(initialInterviewPreparation(application,{...blank,starStories:'Manual STAR'},language).starStories,'Manual STAR');
  const saved={...first,starStories:'',interviewerQuestions:'Edited',updatedAt:'2026-11-26T10:00:00Z'};
  assert.deepEqual(initialInterviewPreparation(application,saved,language),saved);
 }
});
