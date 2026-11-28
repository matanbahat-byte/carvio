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
