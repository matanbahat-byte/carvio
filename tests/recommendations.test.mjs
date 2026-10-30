import test from 'node:test';
import assert from 'node:assert/strict';
import {rankNextActions,recommendationKey} from '../lib/recommendations.ts';
const now=Date.parse('2026-10-30T10:00:00Z');
const app=(status='Considering',patch={})=>({id:status,company:'QA',role:'QA role',status,eventDateTime:'',eventType:'',lastActivityAt:'2026-10-30',appliedDate:'',nextStep:'Review requirements',nextStepDue:'',contactName:'',priority:'Medium',trafficLight:'none',...patch});
const rank=(applications,patch={})=>rankNextActions({applications,contacts:[],recoveryEntries:[],dailyMood:'',language:'en',now,...patch});
test('same snapshot and clock return identical recommendations without mutation',()=>{
 const apps=[app()]; const before=JSON.stringify(apps);assert.deepEqual(rank(apps),rank(apps));assert.equal(JSON.stringify(apps),before);
});
test('Considering remains a saved action, not an application follow-up',()=>{assert.equal(rank([app()])[0].id,'app-undated-Considering');assert.equal(rank([app()])[0].intent,'open');});
test('Interview and Offer dates take precedence over undated actions',()=>{
 assert.ok(rank([app(),app('Interview',{eventDateTime:'2026-10-31T10:00:00Z',eventType:'Interview'})])[0].id.startsWith('app-event-'));
 assert.ok(rank([app(),app('Offer',{nextStepDue:'2026-10-31'})])[0].id.startsWith('app-upcoming-'));
});
test('closed records never emit ordinary overdue actions',()=>{
 for(const status of ['Rejected','Withdrawn','Accepted']) assert.equal(rank([app(status,{nextStepDue:'2026-10-29'})]).some(x=>x.id.startsWith('app-due-')),false);
});
test('overdue recommendations stay bounded and dismissed actions respect changed labels',()=>{
 const apps=Array.from({length:12},(_,i)=>app('Applied',{id:String(i),nextStepDue:'2026-10-29'}));assert.ok(rank(apps).length<=4);
 const first=rank([app()])[0];assert.equal(rank([app()],{dismissed:[recommendationKey(first)]})[0].id,'healthy');assert.equal(rank([app('Considering',{nextStep:'Different task'})],{dismissed:[recommendationKey(first)]})[0].label,'Different task');
});
test('networking intent promotes explicit contact actions without inventing urgency',()=>{
 const contact={id:'c',name:'QA',company:'QA',nextAction:'Ask a specific question',nextActionDue:'',lastContactDate:''};
 assert.equal(rank([app()],{contacts:[contact],usageIntent:'networking_focus'})[0].contactId,'c');
 assert.match(rank([],{contacts:[contact],usageIntent:'networking_focus'})[0].detail,/no due date/);
});
