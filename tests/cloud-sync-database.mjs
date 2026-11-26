/** Actual PostgreSQL/RLS in an ephemeral local engine; never connects to Supabase. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {writeCloudWorkspace,WorkspaceConflictError} from '../lib/cloud-workspace.ts';
const {PGlite}=createRequire(`${process.env.CARVIO_QA_NODE_MODULES||'/tmp/carvio-db-qa/node_modules'}/../package.json`)('@electric-sql/pglite');
const db=new PGlite();
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${A}'),('${B}');`);
 const schema=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');
 const table=schema.match(/create table if not exists public\.user_workspaces \([\s\S]*?\n\);/)?.[0];
 const policy=schema.match(/create policy "Users can manage their own workspace"[\s\S]*?with check \(auth\.uid\(\) = user_id\);/)?.[0];assert.ok(table&&policy);
 await db.exec(table);await db.exec('alter table public.user_workspaces enable row level security;grant select,insert,update,delete on public.user_workspaces to authenticated,anon;');await db.exec(policy);
 const actor=(id,fn,role='authenticated')=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);return fn(tx);});
 const adapter=tx=>({from(name){assert.equal(name,'user_workspaces');let row,insert=false;const conditions=[];return{insert(v){row=v;insert=true;return this;},update(v){row=v;return this;},eq(k,v){assert.ok(['user_id','updated_at'].includes(k));conditions.push([k,v]);return this;},select(){return this;},async maybeSingle(){
 const args=[row.user_id,row.schema_version,JSON.stringify(row.workspace_data),row.updated_at];
 let sql=insert?'insert into public.user_workspaces(user_id,schema_version,workspace_data,updated_at)values($1,$2,$3::jsonb,$4::timestamptz)':'update public.user_workspaces set user_id=$1,schema_version=$2,workspace_data=$3::jsonb,updated_at=$4::timestamptz where '+conditions.map(([k,v])=>{args.push(v);return `${k}=$${args.length}${k==='updated_at'?'::timestamptz':''}`;}).join(' and ');
 try{const r=await tx.query(sql+' returning updated_at::text as updated_at',args);return{data:r.rows[0]||null,error:null};}catch(error){return{data:null,error};}
 }};}});
 const payload={schemaVersion:1,applications:[{id:'phone-one'},{id:'phone-two'}],contacts:[{id:'contact'}],searchTasks:[{id:'saved-search'}]};
 const baseline=await actor(A,tx=>writeCloudWorkspace(adapter(tx),{userId:A,updatedAt:null},payload));
 const own=await actor(A,async tx=>(await tx.query('select workspace_data from public.user_workspaces')).rows);assert.deepEqual(own[0].workspace_data,payload);
 assert.deepEqual(await actor(B,async tx=>(await tx.query('select user_id from public.user_workspaces')).rows),[]);
 assert.deepEqual(await actor(null,async tx=>(await tx.query('select user_id from public.user_workspaces')).rows,'anon'),[]);
 await assert.rejects(actor(B,tx=>writeCloudWorkspace(adapter(tx),{userId:A,updatedAt:baseline.updatedAt},{schemaVersion:1,applications:[]})),WorkspaceConflictError);
 const next=await actor(A,tx=>writeCloudWorkspace(adapter(tx),baseline,{...payload,applications:[...payload.applications,{id:'desktop-three'}]}));assert.notEqual(next.updatedAt,baseline.updatedAt);
 await assert.rejects(actor(A,tx=>writeCloudWorkspace(adapter(tx),baseline,{schemaVersion:1,applications:[]})),WorkspaceConflictError);
 const final=await actor(A,async tx=>(await tx.query('select workspace_data from public.user_workspaces')).rows[0].workspace_data);
 assert.equal(final.applications.length,3);assert.equal(final.contacts.length,1);assert.equal(final.searchTasks.length,1);
 console.log('PASS: real PostgreSQL ownership RLS, signed-out denial, stale-write rejection and preservation of applications/contacts/saved searches');
}finally{await db.close();}
