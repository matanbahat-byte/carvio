import {createClient} from '@supabase/supabase-js';
import {generateRadarReports} from '../lib/job-radar-report-store.ts';
import {appendFile} from 'node:fs/promises';
import {radarReportMarkdown} from '../lib/job-radar-report-format.ts';
import {radarDailyReport} from '../lib/job-radar-report.ts';
const args=process.argv.slice(2);
if(args.some(a=>!['--dry-run','--persist','--fixtures'].includes(a))||args.includes('--persist')&&args.includes('--dry-run'))throw Error('Use --dry-run [--fixtures] or --persist');
if(args.includes('--fixtures')){
 const report=radarDailyReport([{digestId:'fixture-only',event:'sent',at:'2026-11-27T07:00:00Z'},{digestId:'fixture-only',event:'saved',at:'2026-11-28T07:00:00Z'}],'2026-11-27',{asOf:new Date('2026-11-29T10:00:00Z')});
 console.log(JSON.stringify({fixtures:true,report}));
}else{
 if(process.env.RADAR_SUPABASE_URL!=='https://pzykndfxenwqnpvrbkby.supabase.co'||!process.env.RADAR_SUPABASE_SERVICE_ROLE_KEY)throw Error('Isolated development backend credentials required');
 const client=createClient(process.env.RADAR_SUPABASE_URL,process.env.RADAR_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const reports=await generateRadarReports(client,{persist:args.includes('--persist')});
 console.log(JSON.stringify({persisted:args.includes('--persist'),reports}));
 if(process.env.GITHUB_STEP_SUMMARY&&reports[0])await appendFile(process.env.GITHUB_STEP_SUMMARY,radarReportMarkdown(reports[0])+'\n');
}
