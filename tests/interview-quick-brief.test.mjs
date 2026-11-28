import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInterviewQuickBrief} from '../lib/interview-quick-brief.ts';
const job={id:'a',company:'Real Co',role:'HR Director',requirementEvidence:[{id:'r1',requirement:'Lead a team',evidence:'Led 3 team members'},{id:'r2',requirement:'Workforce planning',evidence:''}],evidenceItems:[{id:'foreign',applicationId:'b',requirementIds:['r2'],text:'PRIVATE OTHER JOB'}]};
test('personalized brief includes only saved experience and role-specific practice',()=>{
 const brief=buildInterviewQuickBrief(job,{professionalSummary:'Built a global people function'},'Executive','en');
 assert.match(brief,/HR Director · Real Co/);assert.match(brief,/Built a global people function/);assert.match(brief,/Led 3 team members/);assert.match(brief,/90 days/);assert.match(brief,/No linked example saved/);assert.doesNotMatch(brief,/PRIVATE OTHER JOB/);
});
test('Hebrew and description fallback honestly identify missing evidence',()=>{
 const brief=buildInterviewQuickBrief({...job,requirementEvidence:[],jobDescription:'Requirements:\nExperience with SQL'}, {},'Professional','he');
 assert.match(brief,/SQL/);assert.match(brief,/לא נשמרה דוגמה/);assert.match(brief,/לא בוצע מחקר חיצוני/);
});

test('quick brief quotes saved CV lines as unproven, labelled leads and never invents stories', () => {
  const cv = 'Led a team of 6 engineers migrating billing to Stripe, cutting failed payments by 18%.\nHobbies: chess.';
  const out = buildInterviewQuickBrief({ id: '1', company: 'Acme', role: 'PM', requirements: 'Stripe billing experience\nKubernetes', requirementEvidence: [] }, {}, 'General', 'en', cv);
  assert.match(out, /word match only, not proof/);
  assert.match(out, /Draft: "In my background: Led a team of 6 engineers migrating billing to Stripe/);
  assert.match(out, /states an outcome as written/);
  assert.doesNotMatch(out, /chess/);
  assert.match(out, /No linked examples are saved/);
});

test('numbers alone are not outcomes', () => {
  const brief = cv => buildInterviewQuickBrief({ id: '1', company: 'Acme', role: 'PM', requirements: 'Stripe billing experience', requirementEvidence: [] }, {}, 'General', 'en', cv);
  for (const line of ['Worked on Stripe billing for 5 years since 2019 in a team of six engineers.', 'Owned the Stripe billing annual budget of 2,000,000 USD.']) {
    const out = brief(line);
    assert.match(out, /Missing: the result of this work/);
    assert.doesNotMatch(out, /states an outcome/);
  }
  assert.match(brief('Migrated Stripe billing, cutting failed payments by 18%.'), /states an outcome as written/);
});
