import type {RadarWorkerSubscription} from './job-radar-dispatch.ts';
export function radarPilotReadiness(subscriptions:readonly RadarWorkerSubscription[],checks:{sourceApproved:boolean;oauthConfigured:boolean;routesReleased:boolean},limit=10){
 if(!Number.isInteger(limit)||limit<5||limit>10)throw Error('Pilot size must be 5–10');
 const unique=new Map(subscriptions.filter(s=>s.enabled&&s.verified&&s.consentVersion==='job-radar-v1'&&s.email).map(s=>[s.userId,s]));
 const eligible=[...unique.values()].slice(0,limit);
 const blockers=[...(eligible.length<5?['at_least_five_explicit_consents_required']:[]),...(!checks.sourceApproved?['authorized_source_required']:[]),...(!checks.oauthConfigured?['runtime_gmail_oauth_required']:[]),...(!checks.routesReleased?['internal_routes_release_required']:[])];
 return {target:limit,eligibleCount:eligible.length,ready:blockers.length===0,blockers};
}
