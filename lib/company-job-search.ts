import { normalizePublicBoardJobs, publicBoardEndpoint, type PublicBoard, type PublicJob } from './free-job-sources.ts';
import { linkedInRoleTerms, providerCountry, type SearchProfile } from './job-search.ts';
import { isExecutiveHrSearch, matchesExecutiveHrTitle } from './role-intent.ts';

// Fixed public employer boards. Browser input can never supply a fetch destination.
// Read-only Job Board API; no application submissions, accounts or paid services.
export const COMPANY_BOARDS: readonly PublicBoard[] = [
  { provider:'greenhouse', token:'scaleops', company:'ScaleOps' },
  { provider:'greenhouse', token:'wizinc', company:'Wiz' },
  { provider:'greenhouse', token:'gongio', company:'Gong' },
  { provider:'greenhouse', token:'via', company:'Via' },
];
export type CompanyCriteria = Pick<SearchProfile,'role'|'country'|'location'|'radius'>;
export type CheckedCompanyJob = PublicJob & { checkedAt:string; matchedLocation:string };
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const includes=(value:string,term:string)=>!!term.trim()&&(` ${norm(value)} `).includes(` ${norm(term)} `);
const countries:Record<string,string[]>={Israel:['Israel','ישראל'],Netherlands:['Netherlands','Nederland','הולנד'],Germany:['Germany','Deutschland','גרמניה'],'United States':['United States','USA'],'United Kingdom':['United Kingdom','UK']};
const cities: {names:string[];point:[number,number]}[]=[
 {names:['Tel Aviv','Tel Aviv Yafo','תל אביב','תל אביב יפו'],point:[32.0853,34.7818]},
 {names:['Jerusalem','ירושלים'],point:[31.7683,35.2137]},
 {names:['Haifa','חיפה'],point:[32.794,34.9896]},
 {names:['Herzliya','הרצליה'],point:[32.1663,34.8433]},
 {names:['Ramat Gan','רמת גן'],point:[32.0684,34.8248]},
 {names:['Petah Tikva','פתח תקווה'],point:[32.084,34.8878]},
 {names:['Netanya','נתניה'],point:[32.3215,34.8532]},
 {names:['Beer Sheva','Beersheba','באר שבע'],point:[31.252,34.7915]},
 {names:['Raanana','Ra anana','רעננה'],point:[32.1848,34.8713]},
];
const cityFor=(value:string)=>cities.find(c=>c.names.some(n=>includes(value,n)));
function distance(a:[number,number],b:[number,number]) {const r=Math.PI/180;const d1=(b[0]-a[0])*r,d2=(b[1]-a[1])*r;const h=Math.sin(d1/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(d2/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
export function matchesCompanyGeography(location:string,p:CompanyCriteria) {
 const country=providerCountry(p.country);const aliases=countries[country]||[country];
 if(!country||!aliases.some(c=>includes(location,c)))return false;
 if(!p.location.trim())return true;
 const selected=cityFor(p.location);
 if(includes(location,p.location)||selected?.names.some(c=>includes(location,c)))return true;
 const radius=Number(p.radius);const actual=cityFor(location);
 // Radius expansion is available only for explicit Israeli city coordinates.
 // A 2km margin avoids calling boundary/approximate city-centre distances exact.
 return country==='Israel'&&Number.isFinite(radius)&&radius>0&&radius<=200&&!!selected&&!!actual&&distance(selected.point,actual.point)+2<=radius;
}
function matchesRole(title:string,role:string){return isExecutiveHrSearch(role)?matchesExecutiveHrTitle(title):linkedInRoleTerms(role).some(term=>includes(title,term));}
export function selectCompanyJobs(board:PublicBoard,payload:unknown,p:CompanyCriteria,now:Date):CheckedCompanyJob[]{
 if(!p.role.trim()||!p.country.trim()||!Number.isFinite(now.getTime()))return [];
 const records=(payload as {jobs?:unknown})?.jobs;if(!Array.isArray(records))return [];
 const jobs=normalizePublicBoardJobs(board,payload);const found:CheckedCompanyJob[]=[];
 for(const job of jobs){
  const raw=records.find(r=>r&&String(r.id)===job.id.split(':').at(-1));
  // Prospect/talent-pool posts are not open jobs; expired application windows fail closed.
  if(!raw||raw.internal_job_id===null||!matchesRole(job.title,p.role))continue;
  if(raw.application_deadline!==undefined&&raw.application_deadline!==null){const deadline=Date.parse(raw.application_deadline);if(!Number.isFinite(deadline)||deadline<=now.getTime())continue;}
  const locations=[job.location];
  // Only enrich a short city label from its own matching office; never infer
  // country from company HQ, description text, or a generic Remote label.
  if(job.location.trim()&&!/remote|anywhere|worldwide|מרחוק/i.test(job.location)&&Array.isArray(raw.offices))for(const office of raw.offices){
   if(typeof office?.location==='string'&&includes(office.location,job.location))locations.push(office.location);
  }
  const matchedLocation=locations.find(l=>matchesCompanyGeography(l,p));
  if(matchedLocation)found.push({...job,matchedLocation,checkedAt:now.toISOString()});
 }
 return found;
}
async function readJson(url:string,request:typeof fetch){
 const response=await request(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
 if(!response.ok||!response.headers.get('content-type')?.includes('json')||!response.body)throw Error('unavailable');
 const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6_000_000)throw Error('oversize');chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder().decode(data));
}
export async function searchCompanyJobs(p:CompanyCriteria,request:typeof fetch=fetch,now=new Date(),boards:readonly PublicBoard[]=COMPANY_BOARDS,targetId?:string){
 if(!p.role.trim()||!p.country.trim())return {jobs:[] as CheckedCompanyJob[],unavailable:0,checkedSources:0};
 const results=await Promise.allSettled(boards.map(async board=>{
  const payload=await readJson(publicBoardEndpoint(board)+'?content=true',request);
  if(!Array.isArray(payload?.jobs))throw Error('invalid');
  return selectCompanyJobs(board,payload,p,now).map(job=>({job,board}));
 }));
 const candidates=results.flatMap(r=>r.status==='fulfilled'?r.value:[]).filter(item=>!targetId||item.job.id===targetId).slice(0,12);
 const verified=await Promise.allSettled(candidates.map(async({job,board})=>{
  const id=job.id.split(':').at(-1)!;
  const detail=await readJson(publicBoardEndpoint(board)+'/'+encodeURIComponent(id)+'?content=true',request);
  if(String(detail?.id)!==id)return [];
  return selectCompanyJobs(board,{jobs:[detail]},p,new Date(Math.max(now.getTime(),Date.now())));
 }));
 return {jobs:verified.flatMap(r=>r.status==='fulfilled'?r.value:[]),unavailable:results.filter(r=>r.status==='rejected').length+verified.filter(r=>r.status==='rejected').length,checkedSources:results.filter(r=>r.status==='fulfilled').length};
}
export function companySearchPath(profile:CompanyCriteria,language='he'){
 return '/company-jobs?'+new URLSearchParams({q:profile.role,country:profile.country,city:profile.location,radius:profile.radius,lang:language==='en'?'en':'he'});
}
