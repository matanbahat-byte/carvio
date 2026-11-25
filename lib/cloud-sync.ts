/** Three-way synchronization. Checkpoints contain SHA-256 digests, never duplicate CV contents. */
type JsonObject = Record<string, unknown>;
export type SyncNode = { hash: string; kind: 'object' | 'records' | 'value'; children?: Record<string, SyncNode> };
export type SyncCheckpoint = { version: 1; userId: string; revision: string | null; node: SyncNode };
export class SyncConflictError extends Error {
  readonly paths: string[];
  constructor(paths: string[]) { super('Both devices changed the same information; both copies were preserved.'); this.name = 'SyncConflictError'; this.paths = paths; }
}
const collections = ['applications','contacts','resumes','searchTasks','recoveryEntries','actionEvents'];
const object = (v: unknown): v is JsonObject => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const records = (v: unknown): v is (JsonObject & {id:string})[] => Array.isArray(v) && v.every(item=>object(item)&&typeof item.id==='string'&&item.id.length>0) && new Set(v.map(item=>item.id)).size===v.length;
const canonical = (v: unknown): string => v === undefined ? 'undefined' : Array.isArray(v) ? `[${v.map(item=>canonical(item===undefined?null:item)).join(',')}]` : object(v) ? `{${Object.keys(v).filter(key=>v[key]!==undefined).sort().map(key=>JSON.stringify(key)+':'+canonical(v[key])).join(',')}}` : JSON.stringify(v);
export async function snapshot(value: unknown): Promise<SyncNode> {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const entries = object(value) ? Object.entries(value).filter(([,item])=>item!==undefined) : records(value) ? value.map(item=>[item.id,item] as const) : null;
  return {hash,kind:object(value)?'object':records(value)?'records':'value',...(entries?{children:Object.fromEntries(await Promise.all(entries.map(async([key,item])=>[key,await snapshot(item)])))}:{})};
}
export async function mergeCloudWorkspace<T extends {schemaVersion:number}>(base: SyncNode | null, local: T, remote: T | null): Promise<T> {
  if (!remote) return structuredClone(local);
  const [ln,rn] = await Promise.all([snapshot(local),snapshot(remote)]);
  const conflicts:string[]=[];
  function merge(b:SyncNode|undefined,l:unknown,r:unknown,a:SyncNode|undefined,c:SyncNode|undefined,path:string):unknown {
    if(a?.hash===c?.hash)return l;
    if(b && a?.hash===b.hash)return r;
    if(b && c?.hash===b.hash)return l;
    if(!b && l===undefined)return r;
    if(!b && r===undefined)return l;
    if(a?.kind==='object'&&c?.kind==='object'&&(!b||b.kind==='object')){
      const lv=l as JsonObject,rv=r as JsonObject;
      return Object.fromEntries([...new Set([...Object.keys(b?.children||{}),...Object.keys(lv),...Object.keys(rv)])].flatMap(key=>{
        const value=merge(b?.children?.[key],lv[key],rv[key],a.children?.[key],c.children?.[key],`${path}.${key}`);return value===undefined?[]:[[key,value]];
      }));
    }
    if(a?.kind==='records'&&c?.kind==='records'&&(!b||b.kind==='records')){
      const lv=new Map((l as (JsonObject&{id:string})[]).map(v=>[v.id,v])),rv=new Map((r as (JsonObject&{id:string})[]).map(v=>[v.id,v]));
      return [...new Set([...rv.keys(),...lv.keys(),...Object.keys(b?.children||{})])].flatMap(key=>{
        const value=merge(b?.children?.[key],lv.get(key),rv.get(key),a.children?.[key],c.children?.[key],`${path}[${key}]`);return value===undefined?[]:[value];
      });
    }
    if(/\.(lastActivityAt|updatedAt|updated_at)$/.test(path)&&typeof l==='string'&&typeof r==='string'&&Number.isFinite(Date.parse(l))&&Number.isFinite(Date.parse(r)))return Date.parse(l)>=Date.parse(r)?l:r;
    conflicts.push(path);return l;
  }
  let result:unknown;
  if(base) result=merge(base,local,remote,ln,rn,'workspace');
  else {
    // First device adoption: union saved records; cloud preferences win, with the
    // previous local workspace retained by the caller before applying changes.
    const l=local as unknown as JsonObject,r=remote as unknown as JsonObject;
    const merged={...l,...r};
    for(const key of collections)merged[key]=merge(undefined,l[key],r[key],ln.children?.[key],rn.children?.[key],key);
    result=merged;
  }
  // An older client cannot delete future root fields it does not represent.
  for(const [key,value] of Object.entries(remote))if(!Object.prototype.hasOwnProperty.call(local,key))(result as JsonObject)[key]=value;
  if(conflicts.length)throw new SyncConflictError(conflicts);
  return structuredClone(result) as T;
}

export function createCloudSynchronizer<T extends {schemaVersion:number}>(options:{
  userId:string; checkpoint:SyncCheckpoint|null;
  readLocal:()=>T; applyLocal:(value:T)=>void;
  readRemote:()=>Promise<{workspace:T;revision:string}|null>;
  writeRemote:(value:T,revision:string|null)=>Promise<string>;
  preserveLocal:(value:T)=>void; saveCheckpoint:(value:SyncCheckpoint)=>void;
  isCurrent:()=>boolean;
}) {
  let checkpoint=options.checkpoint?.userId===options.userId?options.checkpoint:null;
  let active=true,running:Promise<void>|null=null,requested=false;
  const current=()=>active&&options.isCurrent();
  async function once(){
    const remote=await options.readRemote();if(!current())return;
    const local=structuredClone(options.readLocal());
    const merged=await mergeCloudWorkspace(checkpoint?.node||null,local,remote?.workspace||null);if(!current())return;
    const [localNode,mergedNode,remoteNode]=await Promise.all([snapshot(local),snapshot(merged),remote?snapshot(remote.workspace):Promise.resolve(null)]);
    // Preserve the local copy before changing either side. Failure stops the sync.
    if(localNode.hash!==mergedNode.hash)options.preserveLocal(local);
    let revision=remote?.revision||null;
    if(!remoteNode||remoteNode.hash!==mergedNode.hash){if(!current())return;revision=await options.writeRemote(merged,revision);}
    if(!current())return;
    const latest=structuredClone(options.readLocal());
    const rebased=await mergeCloudWorkspace(localNode,latest,merged);if(!current())return;
    const latestNode=await snapshot(latest),rebasedNode=await snapshot(rebased);
    if(latestNode.hash!==rebasedNode.hash){options.preserveLocal(latest);options.applyLocal(rebased);}
    const next:SyncCheckpoint={version:1,userId:options.userId,revision,node:mergedNode};
    options.saveCheckpoint(next);checkpoint=next;
    if(rebasedNode.hash!==mergedNode.hash)requested=true;
  }
  return {
    sync():Promise<void>{
      if(running){requested=true;return running;}
      running=(async()=>{let attempts=0;do{requested=false;try{await once();}catch(error){if(current()&&error instanceof Error&&error.name==='WorkspaceConflictError'&&attempts<3)requested=true;else throw error;}}while(current()&&requested&&++attempts<4);})().finally(()=>{running=null;});return running;
    },
    cancel(){active=false;requested=false;},
  };
}
