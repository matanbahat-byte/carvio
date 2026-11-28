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
  assert.match(out, /Draft answer: Led a team of 6 engineers migrating billing to Stripe/);
  assert.match(out, /Result as written: cutting failed payments by 18%/);
  assert.doesNotMatch(out, /chess/);
  assert.match(out, /No linked examples are saved/);
});

test('numbers alone are not outcomes', () => {
  const brief = cv => buildInterviewQuickBrief({ id: '1', company: 'Acme', role: 'PM', requirements: 'Stripe billing experience', requirementEvidence: [] }, {}, 'General', 'en', cv);
  for (const line of ['Worked on Stripe billing for 5 years since 2019 in a team of six engineers.', 'Owned the Stripe billing annual budget of 2,000,000 USD.']) {
    const out = brief(line);
    assert.match(out, /To complete:.*the result/);
    assert.doesNotMatch(out, /Result as written/);
  }
  assert.match(brief('Migrated Stripe billing, cutting failed payments by 18%.'), /Result as written: cutting failed payments by 18%/);
});

test('result is split out only when a clause states an outcome', async () => {
  const { splitActionResult } = await import('../lib/interview-quick-brief.ts');
  const a = splitActionResult('Led a team of 6 engineers migrating billing to Stripe, cutting failed payments by 18%.');
  assert.equal(a.action, 'Led a team of 6 engineers migrating billing to Stripe');
  assert.equal(a.result, 'cutting failed payments by 18%');
  const b = splitActionResult('Worked on Stripe billing for 5 years, in a team of six.');
  assert.equal(b.result, '');
});

test('a qualitative outcome without a number is kept and no number is invented', async () => {
  const { splitActionResult } = await import('../lib/interview-quick-brief.ts');
  const r = splitActionResult('Rebuilt the onboarding flow, improving activation for new users.');
  assert.equal(r.result, 'improving activation for new users');
  assert.doesNotMatch(r.result, /\d/);
});
