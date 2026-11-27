import test from 'node:test';import assert from 'node:assert/strict';
import {radarTrafficSummary} from '../lib/job-radar-traffic.ts';
import {radarDailyReport} from '../lib/job-radar-report.ts';
const at='2026-11-27T10:00:00Z';
test('traffic dedups sessions and events, separates verified Radar from unattributed, omits identities',()=>{
 const e=(id,user_id,event_name,sid='s')=>({id,user_id,event_name,created_at:at,properties:{sessionId:sid}});
 const events=[e('1','u','session_started'),e('2','u','opportunity_saved'),e('3','u','radar_visit_verified'),e('3','u','radar_visit_verified'),e('4','u','return_visit'),e('5','v','session_started'),e('6','v','marked_applied'),e('7',null,'session_started'),e('8','z','session_heartbeat')];
 const r=radarTrafficSummary(events,Date.parse('2026-11-27'),Date.parse('2026-11-28'));
 assert.equal(r.radar.sessions,1);assert.equal(r.radar.returningUsers,1);assert.equal(r.radar.saveRate,1);assert.equal(r.organicOrUnattributed.sessions,1);assert.equal(r.organicOrUnattributed.applyingSessions,1);assert.ok(!JSON.stringify(r).includes('user_id'));
});
test('dedups opt-outs per user per Israel day independently of sent cohort and excludes dry-run',()=>{
 const r=radarDailyReport([{digestId:'a',event:'sent',actorKey:'u',at},{digestId:'b',event:'sent',actorKey:'u',at},{digestId:'a',event:'returned',actorKey:'u',at},{digestId:'b',event:'returned',actorKey:'u',at},{digestId:'x',event:'unsubscribed',actorKey:'u',at},{digestId:'y',event:'unsubscribed',actorKey:'u',at},{digestId:'z',event:'unsubscribed',actorKey:'v',at,mode:'dry-run'}],'2026-11-27',{asOf:new Date('2026-11-28')});
 assert.equal(r.returned,2);assert.equal(r.returningUsers,1);assert.equal(r.unsubscribedUsers,1);assert.ok(!JSON.stringify(r).includes('actorKey'));
});
