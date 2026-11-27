// This entry point is deliberately dry-run only. It cannot instantiate Gmail transport.
import {createClient} from '@supabase/supabase-js';
import {createRadarWorker} from '../lib/job-radar-worker.ts';
const args=process.argv.slice(2);
if(!args.includes('--dry-run')||args.some(a=>!['--dry-run','--fixtures'].includes(a)))throw Error('This development entry point accepts --dry-run [--fixtures] only');
if(args.includes('--fixtures')) {
 const {radarDispatchFixture}=await import('../tests/fixtures/job-radar-dispatch.mjs');
 const report={mode:'dry-run',fixtures:true,scenarios:[],actualSendCalls:0};
 for(const [name,patch] of [['eligible',{}],['no_new_jobs',{jobs:[]}],['revoked',{latest:{enabled:false}}],['closed_jobs',{closed:true}],['missing_history',{historyMissing:true}]]){
  const f=radarDispatchFixture(patch);const result=await f.run();report.scenarios.push({name,...result});report.actualSendCalls+=f.counts().sends;
 }
 if(report.actualSendCalls!==0)throw Error('Dry-run sender invariant failed');
 console.log(JSON.stringify(report));
} else {
 const url=process.env.RADAR_SUPABASE_URL;const key=process.env.RADAR_SUPABASE_SERVICE_ROLE_KEY;
 if(url!=='https://pzykndfxenwqnpvrbkby.supabase.co'||!key){console.log(JSON.stringify({mode:'dry-run',blocked:'isolated_dev_database_credentials_required',actualSendCalls:0}));process.exitCode=2;}
 else {
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const worker=createRadarWorker(client);
  const summary={mode:'dry-run',checked:0,results:{},actualSendCalls:0,capacityReached:false};
  for(let offset=0;offset<200;offset+=50){
   const result=await client.from('job_radar_preferences').select('user_id').eq('enabled',true).order('user_id').range(offset,offset+49).abortSignal(AbortSignal.timeout(10000));
   if(result.error)throw Error('Subscription enumeration unavailable');
   for(const row of result.data){const outcome=await worker.dispatch(row.user_id,'dry-run');summary.checked++;summary.results[outcome.status]=(summary.results[outcome.status]||0)+1;}
   if(result.data.length<50)break;
   if(offset===150)summary.capacityReached=true;
  }
  // No recipient, account ID, body, subject or OAuth token in CI logs.
  console.log(JSON.stringify(summary));
 }
}
