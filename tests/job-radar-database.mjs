import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { PGlite } = createRequire(`${process.env.CARVIO_QA_NODE_MODULES || '/tmp/carvio-db-qa/node_modules'}/../package.json`)('@electric-sql/pglite');
const db = new PGlite();
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
try {
 await db.exec(`create role authenticated; create role anon; create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean default false); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; insert into auth.users values('${a}',now(),false),('${b}',null,false);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261127090000_job_radar.sql',import.meta.url),'utf8'));
 const actor=(id,fn,role='authenticated')=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);return fn(tx);});
 const prefs={role:'Engineer',country:'Israel',city:'Tel Aviv',workModel:'Hybrid',seniority:'Senior',employmentType:'Full-time',email:'never-store@example.test'};
 const save=(id,enabled=true,frequency=3)=>actor(id,tx=>tx.query("select public.save_job_radar_preferences($1,$2::jsonb,$3,'he','job-radar-v1')",[enabled,JSON.stringify(prefs),frequency]));
 await save(a);
 let rows=await actor(a,async tx=>(await tx.query('select * from public.job_radar_preferences')).rows);
 assert.equal(rows[0].enabled,true);assert.ok(rows[0].consented_at);assert.equal(rows[0].preferences.email,undefined);
 assert.equal((await actor(b,async tx=>(await tx.query('select * from public.job_radar_preferences')).rows)).length,0);
 await assert.rejects(save(b));await assert.rejects(save(a,true,7));
 await assert.rejects(actor('',tx=>tx.query('select * from public.job_radar_preferences'),'anon'));
 await assert.rejects(actor(a,tx=>tx.query('update public.job_radar_preferences set enabled=false')));
 await save(a,true,2);
 await save(a,false,3);
 rows=await actor(a,async tx=>(await tx.query('select * from public.job_radar_preferences')).rows);
 assert.equal(rows[0].enabled,false);assert.ok(rows[0].revoked_at);assert.equal(rows[0].frequency_per_week,2);
 assert.equal((await actor(a,async tx=>(await tx.query('select * from public.job_radar_consent_events')).rows)).length,3);
 await assert.rejects(actor(a,tx=>tx.query('delete from public.job_radar_consent_events')));
 console.log('PASS: verified consent, revoke, frequency, field allowlist, isolation, anonymous denial, immutable audit and atomic failure');
} finally { await db.close(); }
