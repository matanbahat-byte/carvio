import {runRadarDispatch} from '../../lib/job-radar-dispatch.ts';
export function radarDispatchFixture(patch={}) {
 const now=new Date('2026-11-29T07:00:00Z');
 const board={provider:'greenhouse',token:'fixture',company:'Fictional company'};
 const subscription={userId:'fixture-user',email:'fictional@example.test',verified:true,enabled:true,consentVersion:'job-radar-v1',updatedAt:'2026-11-29T06:00:00Z',frequency:3,language:'he',preferences:{role:'מנהלת גיוס',country:'ישראל',city:'תל אביב',seniority:''},...patch.subscription};
 const jobs=Array.from({length:6},(_,i)=>({id:i+1,title:'Recruitment Manager',location:{name:'Tel Aviv, Israel'},absolute_url:`https://boards.greenhouse.io/fixture/jobs/${i+1}`,first_published:'2026-11-28T00:00:00Z'}));
 const events=[];const claims=new Set();const histories=[];
 let current=subscription;let reserved=[];let readCount=0;let collections=0;let sends=0;let publishes=0;let verifyCalls=0;let serial=0;
 const store={
  async read(){readCount++;if(patch.readError)throw Error('read failure');return {subscription:readCount>1&&patch.latest?{...subscription,...patch.latest}:current,sent:patch.historyMissing?null:[...histories,...(patch.sent||[])]};},
  async claim(user,slot,mode){const key=[user,slot,mode].join(':');if(claims.has(key))return null;claims.add(key);return 'fixture-dispatch-'+(++serial);},
  async reserve(id,selected){if(patch.reserveDenied)return false;reserved=selected;events.push({state:'prepared',at:now.toISOString(),mode:'dry-run'});return true;},
  async gate(){return !patch.gateDenied;},
  async finish(id,state,code,providerId){events.push({id,state,code,providerId,at:now.toISOString()});if(state==='dry_run_ready'||state==='unknown'||state==='sent')histories.push(...reserved.map(j=>({id:j.id,url:j.url})));},
 };
 const deps={store,now:()=>patch.now||now,approvedBoards:[{board,permissionReference:'fixture-only'}],
  async collectFresh(){collections++;return {snapshots:[{board,fetchedAt:now.toISOString(),payload:{jobs:collections>1&&patch.closed?[]:patch.jobs||jobs}}],blockers:[]};},
  async publish(){publishes++;return {subject:'Fixture',html:'<p>Fixture</p>',text:'Fixture'};},
  transport:{async verifySender(){verifyCalls++;return patch.wrongSender?'wrong@example.test':'carvio.team@gmail.com';},async send(){sends++;if(patch.uncertain)throw Error('uncertain');return 'mock-provider-id';}},
  liveEnabled:patch.liveEnabled||false,
 };
 return {deps,run:(mode='dry-run')=>runRadarDispatch(subscription.userId,deps,mode),events,subscription,counts:()=>({collections,sends,publishes,verifyCalls}),revoke:()=>{current={...subscription,enabled:false};}};
}
