// Requires a confirmed fixture account provisioned in carvio-dev, never signup/send email.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { prepareRadarJobs } from '../lib/job-radar-preparation.ts';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'https://pzykndfxenwqnpvrbkby.supabase.co','Isolated dev project required');
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {error:loginError}=await client.auth.signInWithPassword({email:process.env.RADAR_TEST_EMAIL,password:process.env.RADAR_TEST_PASSWORD});
assert.ifError(loginError);
const preferences={role:'מנהלת גיוס',country:'ישראל',city:'תל אביב',seniority:'',workModel:'',employmentType:''};
const save=async enabled=>{const r=await client.rpc('save_job_radar_preferences',{p_enabled:enabled,p_preferences:preferences,p_frequency:2,p_language:'he',p_consent_version:'job-radar-v1'});assert.ifError(r.error);};
try {
 await save(true);
 const now=new Date('2026-11-27T09:00:00Z');
 const board={provider:'greenhouse',token:'fixture',company:'Fixture only'};
 const approvedBoards=[{board,permissionReference:'fixture-only'}];
 const collect=async()=>({blockers:[],snapshots:[{board,fetchedAt:now.toISOString(),payload:{jobs:[{id:1,title:'Recruitment Manager',location:{name:'Tel Aviv, Israel'},absolute_url:'https://boards.greenhouse.io/fixture/jobs/1',first_published:'2026-11-26'}]}}]});
 const options={now:()=>now,approvedBoards};
 const selected=await prepareRadarJobs(client,collect,options);
 assert.equal(selected.jobs.length,1);assert.deepEqual(selected.blockers,[]);
 const {data:{user}}=await client.auth.getUser();
 const forged=await client.from('job_radar_deliveries').insert({user_id:user.id,job_id:'forged',job_url:'https://example.test/forged'});
 assert.ok(forged.error);
 await save(false);
 assert.deepEqual((await prepareRadarJobs(client,collect,options)).blockers,['consent_required']);
 console.log('PASS live dev REST: confirmed fixture login, consent save, persisted preferences/history preparation, client delivery-write denial, revoke');
} finally {await client.auth.signOut();}
