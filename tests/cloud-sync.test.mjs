import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshot,mergeCloudWorkspace,createCloudSynchronizer,SyncConflictError} from '../lib/cloud-sync.ts';
const workspace=(applications=[])=>({schemaVersion:1,applications,contacts:[],resumes:[],searchTasks:[],recoveryEntries:[],actionEvents:[],searchProfile:{role:''},userProfile:{},language:'he',theme:'light',dailyMood:''});
const clone=v=>structuredClone(v);
test('first sign-in unions the two phone applications with an existing desktop workspace',async()=>{
 const phone=workspace([{id:'phone-1',company:'A'},{id:'phone-2',company:'B'}]);const desktop=workspace([{id:'desktop',company:'C'}]);
 const merged=await mergeCloudWorkspace(null,phone,desktop);assert.deepEqual(merged.applications.map(x=>x.id),['desktop','phone-1','phone-2']);assert.equal(phone.applications.length,2);
 assert.deepEqual((await mergeCloudWorkspace(null,workspace(),merged)).applications,merged.applications);
});
test('different records and different fields merge without overwriting concurrent work',async()=>{
 const base=workspace([{id:'a',status:'Applied',notes:'old'}]);const local=clone(base),remote=clone(base);
 local.applications[0].notes='phone note';remote.applications[0].status='Interview';remote.contacts=[{id:'contact',name:'Recruiter'}];local.searchTasks=[{id:'saved-search',role:'Designer'}];
 const result=await mergeCloudWorkspace(await snapshot(base),local,remote);
 assert.deepEqual(result.applications,[{id:'a',status:'Interview',notes:'phone note'}]);assert.equal(result.contacts.length,1);assert.equal(result.searchTasks.length,1);
});
test('same-field conflicts preserve both inputs and block automatic overwrite',async()=>{
 const base=workspace([{id:'a',status:'Applied'}]),local=workspace([{id:'a',status:'Rejected'}]),remote=workspace([{id:'a',status:'Interview'}]);
 await assert.rejects(mergeCloudWorkspace(await snapshot(base),local,remote),SyncConflictError);assert.equal(local.applications[0].status,'Rejected');assert.equal(remote.applications[0].status,'Interview');
});
test('deletions propagate only when the other device did not edit the deleted record',async()=>{
 const base=workspace([{id:'a',status:'Applied'}]);const node=await snapshot(base);
 assert.deepEqual((await mergeCloudWorkspace(node,workspace(),base)).applications,[]);
 assert.deepEqual((await mergeCloudWorkspace(node,base,workspace())).applications,[]);
 await assert.rejects(mergeCloudWorkspace(node,workspace(),workspace([{id:'a',status:'Interview'}])),SyncConflictError);
});
test('checkpoint digests do not duplicate document or contact contents',async()=>{
 const data=workspace();data.resumes=[{id:'cv',content:'PRIVATE CAREER DOCUMENT'}];data.contacts=[{id:'c',email:'private@example.test'}];
 const encoded=JSON.stringify(await snapshot(data));assert.ok(!encoded.includes('PRIVATE'));assert.ok(!encoded.includes('private@example'));assert.match(JSON.parse(encoded).hash,/^[a-f0-9]{64}$/);
});
function harness(initial=workspace()){
 let cloud={workspace:clone(initial),revision:'1'},revision=1,local=workspace(),checkpoint=null,active=true,writes=0,recoveries=[];
 const engine=createCloudSynchronizer({userId:'A',checkpoint:null,readLocal:()=>local,applyLocal:v=>{local=v;},isCurrent:()=>active,
  readRemote:async()=>clone(cloud),writeRemote:async(v,expected)=>{assert.equal(expected,cloud.revision);cloud={workspace:clone(v),revision:String(++revision)};writes++;return cloud.revision;},preserveLocal:v=>recoveries.push(clone(v)),saveCheckpoint:v=>{checkpoint=v;}});
 return {engine,get local(){return local;},set local(v){local=v;},get cloud(){return cloud;},get checkpoint(){return checkpoint;},get writes(){return writes;},get recoveries(){return recoveries;},stop(){active=false;}};
}
test('automatic push and pull persist applications, contacts and saved searches across independent devices',async()=>{
 const h=harness(workspace([{id:'desktop'}]));h.local=workspace([{id:'phone-1'},{id:'phone-2'}]);h.local.contacts=[{id:'c'}];h.local.searchTasks=[{id:'s'}];await h.engine.sync();
 assert.equal(h.cloud.workspace.applications.length,3);assert.equal(h.local.contacts.length,1);assert.ok(h.recoveries.length>0);
 const h2=harness(h.cloud.workspace);await h2.engine.sync();assert.deepEqual(h2.local,h.cloud.workspace);assert.equal(h2.writes,0);
});
test('an interrupted read never replaces local data or claims a checkpoint',async()=>{
 let applied=false,saved=false,wrote=false;
 const engine=createCloudSynchronizer({userId:'A',checkpoint:null,readLocal:()=>workspace([{id:'phone'}]),applyLocal:()=>{applied=true;},readRemote:async()=>{throw new Error('offline');},writeRemote:async()=>{wrote=true;return '2';},preserveLocal:()=>{},saveCheckpoint:()=>{saved=true;},isCurrent:()=>true});
 await assert.rejects(engine.sync(),/offline/);assert.equal(applied||saved||wrote,false);
});
test('local recovery failure stops cloud changes',async()=>{
 let writes=0;
 const engine=createCloudSynchronizer({userId:'A',checkpoint:null,readLocal:()=>workspace([{id:'phone'}]),applyLocal:()=>assert.fail('must not replace'),readRemote:async()=>({workspace:workspace([{id:'desktop'}]),revision:'1'}),writeRemote:async()=>{writes++;return '2';},preserveLocal:()=>{throw new Error('quota');},saveCheckpoint:()=>{},isCurrent:()=>true});
 await assert.rejects(engine.sync(),/quota/);assert.equal(writes,0);
});
test('an account switch cancels an outstanding read before any upload or restore',async()=>{
 let finish,active=true,writes=0,applies=0;
 const engine=createCloudSynchronizer({userId:'A',checkpoint:null,readLocal:()=>workspace([{id:'private-A'}]),applyLocal:()=>{applies++;},readRemote:()=>new Promise(r=>{finish=r;}),writeRemote:async()=>{writes++;return '2';},preserveLocal:()=>{},saveCheckpoint:()=>{},isCurrent:()=>active});
 const request=engine.sync();active=false;engine.cancel();finish({workspace:workspace(),revision:'1'});await request;assert.equal(writes+applies,0);
});
test('edits made during a slow write survive and are replayed using the new revision',async()=>{
 let local=workspace([{id:'first'}]),cloud={workspace:workspace(),revision:'1'},finish,started;
 const writing=new Promise(r=>{started=r;});let writes=0;
 const engine=createCloudSynchronizer({userId:'A',checkpoint:null,readLocal:()=>local,applyLocal:v=>{local=v;},readRemote:async()=>clone(cloud),writeRemote:async(v,expected)=>{assert.equal(expected,cloud.revision);if(++writes===1){started();await new Promise(r=>{finish=r;});}cloud={workspace:clone(v),revision:String(writes+1)};return cloud.revision;},preserveLocal:()=>{},saveCheckpoint:()=>{},isCurrent:()=>true});
 const request=engine.sync();await writing;local.applications.push({id:'second'});finish();await request;
 assert.deepEqual(cloud.workspace.applications.map(x=>x.id),['first','second']);assert.equal(writes,2);
});
test('compare-and-swap races retry by re-reading and merging the other device',async()=>{
 let local=workspace([{id:'phone'}]),cloud={workspace:workspace(),revision:'1'},writes=0;
 const engine=createCloudSynchronizer({userId:'A',checkpoint:null,readLocal:()=>local,applyLocal:v=>{local=v;},readRemote:async()=>clone(cloud),writeRemote:async(v,expected)=>{if(++writes===1){cloud={workspace:workspace([{id:'desktop'}]),revision:'2'};const e=new Error('stale');e.name='WorkspaceConflictError';throw e;}assert.equal(expected,'2');cloud={workspace:v,revision:'3'};return '3';},preserveLocal:()=>{},saveCheckpoint:()=>{},isCurrent:()=>true});
 await engine.sync();assert.equal(writes,2);assert.equal(cloud.workspace.applications.length,2);assert.equal(local.applications.length,2);
});
test('concurrent edit timestamps do not turn independent field changes into a conflict',async()=>{
 const base=workspace([{id:'a',status:'Applied',notes:'',lastActivityAt:'2026-11-25T08:00:00Z'}]);const l=clone(base),r=clone(base);l.applications[0].notes='phone';l.applications[0].lastActivityAt='2026-11-25T09:00:00Z';r.applications[0].status='Interview';r.applications[0].lastActivityAt='2026-11-25T10:00:00Z';
 const merged=await mergeCloudWorkspace(await snapshot(base),l,r);assert.equal(merged.applications[0].notes,'phone');assert.equal(merged.applications[0].status,'Interview');assert.equal(merged.applications[0].lastActivityAt,'2026-11-25T10:00:00Z');
});
test('older clients preserve future root fields in cloud snapshots',async()=>{
 const remote={...workspace([{id:'a'}]),futureDocuments:[{id:'future',data:'preserve'}]};const local=workspace([{id:'a'}]);const merged=await mergeCloudWorkspace(await snapshot(remote),local,remote);assert.deepEqual(merged.futureDocuments,remote.futureDocuments);
});
