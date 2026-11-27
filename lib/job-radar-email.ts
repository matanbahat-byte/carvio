// Server-side composition only. No mail provider, delivery or tracking pixels.
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePublicBoardJobs, type PublicJob } from './free-job-sources.ts';
import {radarSearchSummary,type RadarSavedSearch} from './job-radar-search-memory.ts';

type Language = 'he' | 'en';
export type RadarListing = { id: string; source_id: string; title: string; company: string; location: string; source_url: string; provider: PublicJob['provider']; posted_at: string | null; expires_at: string; is_active: boolean };
export type RadarEmailInput = { jobs: readonly PublicJob[]; language: Language; search?:Partial<RadarSavedSearch>; displayName?: string; origin?: string; dispatchId?: string; trackingTokens?: Record<string,string> };
export const RADAR_PUBLIC_ORIGIN = 'https://carvio-pi.vercel.app';
export const validRadarListingId = (id: string) => /^[a-f0-9]{64}$/.test(id);
export function radarJobPath(id: string, language: Language, token?: string) {
  if (!validRadarListingId(id)) throw new Error('Invalid listing ID');
  if(token&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(token))throw new Error('Invalid attribution token');
  return `/radar/jobs/${id}?lang=${language === 'he' ? 'he' : 'en'}${token?'&r='+token:''}`;
}
export const radarPreferencesPath = (language: Language, stop = false) => `/radar/preferences?lang=${language === 'he' ? 'he' : 'en'}${stop ? '&action=stop' : ''}`;
function origin(value = RADAR_PUBLIC_ORIGIN) {
  // Explicit loopback origin is for local link QA only, never derived from user input.
  if (value !== RADAR_PUBLIC_ORIGIN && !/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(value)) throw new Error('Unapproved CARVIO origin');
  return value;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function safeJobs(jobs: readonly PublicJob[]) {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const result: PublicJob[] = [];
  for (const job of jobs) {
    const parts = /^(greenhouse|lever):([\w-]{1,100}):([^:]+)$/.exec(job.id);
    if (!parts || parts[1] !== job.provider || !job.company.trim() || !job.location.trim()) continue;
    const board = {provider:job.provider, token:parts[2], company:job.company, ...(job.url.startsWith('https://jobs.eu.lever.co/') ? {region:'eu' as const} : {})};
    const payload = job.provider === 'greenhouse'
      ? {jobs:[{id:parts[3],title:job.title,location:{name:job.location},absolute_url:job.url,first_published:job.postedAt}]}
      : [{id:parts[3],text:job.title,categories:{location:job.location},hostedUrl:job.url,createdAt:job.postedAt}];
    const checked = normalizePublicBoardJobs(board, payload)[0];
    if (!checked) continue;
    const url = new URL(checked.url); url.search=''; url.hash='';
    // Employer-hosted Greenhouse URLs need gh_jid to distinguish distinct jobs.
    const posting = new URL(checked.url).searchParams.get('gh_jid');
    if (posting) url.searchParams.set('gh_jid',posting);
    if (ids.has(checked.id) || urls.has(url.href)) continue;
    ids.add(checked.id);urls.add(url.href);result.push(checked);
    if (result.length === 5) break;
  }
  return result;
}
export function radarListingRecord(job: PublicJob, now = new Date()): RadarListing {
  const checked = safeJobs([job])[0];
  if (!checked || !Number.isFinite(now.getTime())) throw new Error('Invalid job');
  return {id:createHash('sha256').update(checked.id).digest('hex'),source_id:checked.id,title:checked.title,company:checked.company,location:checked.location,source_url:checked.url,provider:checked.provider,posted_at:checked.postedAt,expires_at:new Date(now.getTime()+7*86400000).toISOString(),is_active:true};
}
// Defend the internal detail page against malformed catalog rows as well as unsafe input.
export function validRadarListing(value: RadarListing): boolean {
  try {
    const record = radarListingRecord({id:value.source_id,title:value.title,company:value.company,location:value.location,url:value.source_url,provider:value.provider,postedAt:value.posted_at});
    return value.id === record.id;
  } catch { return false; }
}
export function renderRadarEmail(input: RadarEmailInput): {subject: string; html: string; text: string; listingIds: string[]} | null {
  const jobs = safeJobs(input.jobs);
  if (!jobs.length) return null;
  const base = origin(input.origin);
  const he = input.language === 'he';
  const language: Language = he ? 'he' : 'en';
  const t = (a:string,b:string) => he ? a : b;
  const name = input.displayName?.replace(/[\r\n\u0000-\u001f]/g,' ').trim().slice(0,80);
  const greeting = t(name ? `שלום ${name},` : 'שלום,',name ? `Hi ${name},` : 'Hi,');
  const subject = t('משרות חדשות לחיפוש שלך | CARVIO','New jobs for your search | CARVIO');
  const title = t('ההזדמנות הבאה שלך מתחילה כאן','Your next opportunity starts here');
  const searchSummary=input.search?radarSearchSummary(input.search):'';
  const intro = t('בחרנו עבורך משרות שמתאימות לחיפוש שלך. אפשר לפתוח כל משרה ב־CARVIO ולבחור את הצעד הבא.','Here are jobs selected for your search. Open each one in CARVIO and choose your next step.')+(searchSummary?' '+t('החיפוש השמור שלך: ','Your saved search: ')+searchSummary:'');
  const manage = base + radarPreferencesPath(language);
  const stop = base + radarPreferencesPath(language,true);
  const listings = jobs.map(job => ({job,id:radarListingRecord(job).id}));
  const cards = listings.map(({job,id}) => `<tr><td style="padding:0 24px 16px" class="pad"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;border:1px solid #b9e5dc;border-radius:14px;background:#ffffff"><tr><td style="padding:20px;overflow-wrap:anywhere;word-break:break-word"><h2 style="font-size:19px;line-height:1.5;margin:0 0 8px;color:#134e4a"><a href="${escape(base+radarJobPath(id,language,input.trackingTokens?.[id]))}" style="color:#134e4a;text-decoration:none">${escape(job.title)}</a></h2><p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#375c57"><bdi>${escape(job.company)}</bdi><br/><bdi>${escape(job.location)}</bdi></p><a href="${escape(base+radarJobPath(id,language,input.trackingTokens?.[id]))}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:15px;font-weight:bold;line-height:1.5">${t('לפרטי המשרה ב־CARVIO','View job in CARVIO')}</a></td></tr></table></td></tr>`).join('');
  const footer = t('קיבלת את המייל כי בחרת לקבל משרות לפי ההעדפות שלך. אפשר לשנות אותן או להפסיק את ההתראות בכל עת.','You received this email because you chose job alerts for your search. You can change your preferences or stop alerts at any time.');
  const html = `<!doctype html><html lang="${language}" dir="${he?'rtl':'ltr'}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escape(subject)}</title><style>@media only screen and (max-width:480px){.pad{padding-left:16px!important;padding-right:16px!important}.headline{font-size:25px!important}}</style></head><body style="margin:0;padding:0;background:#f0faf7;color:#134e4a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(t('משרות שמתאימות לחיפוש שלך, במקום אחד.','Jobs for your search, together in one place.'))}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0faf7"><tr><td align="center" style="padding:24px 8px"><!--[if mso]><table role="presentation" width="600"><tr><td><![endif]--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" dir="${he?'rtl':'ltr'}" style="max-width:600px;table-layout:fixed;background:#f0fdfa;border:1px solid #b9e5dc;border-radius:18px;text-align:${he?'right':'left'}"><tr><td class="pad" style="padding:28px 24px 24px;background:#ccfbf1;border-radius:18px 18px 0 0"><p dir="ltr" style="margin:0 0 8px;font-size:23px;letter-spacing:2px;color:#0f766e;font-weight:bold">CARVIO</p><p style="margin:0;font-size:13px;color:#375c57">Job Radar</p></td></tr><tr><td class="pad" style="padding:28px 24px 24px;overflow-wrap:anywhere"><p style="margin:0 0 12px;font-size:16px;line-height:1.7">${escape(greeting)}</p><h1 class="headline" style="margin:0 0 14px;font-size:29px;line-height:1.4;color:#134e4a">${escape(title)}</h1><p style="margin:0;font-size:16px;line-height:1.8;color:#375c57">${escape(intro)}</p></td></tr>${cards}<tr><td class="pad" style="padding:12px 24px 28px;font-size:13px;line-height:1.9;color:#375c57"><p style="margin:0 0 12px">${escape(footer)}</p><a href="${escape(manage)}" style="display:inline-block;padding:8px 0;color:#0f766e;text-decoration:underline">${t('שינוי העדפות','Change preferences')}</a><span aria-hidden="true"> · </span><a href="${escape(stop)}" style="display:inline-block;padding:8px 0;color:#0f766e;text-decoration:underline">${t('הפסקת התראות','Stop job alerts')}</a></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  const text = [greeting,title,intro,...listings.map(({job,id})=>`${job.title}\n${job.company}\n${job.location}\n${base+radarJobPath(id,language,input.trackingTokens?.[id])}`),footer,`${t('שינוי העדפות','Change preferences')}: ${manage}`,`${t('הפסקת התראות','Stop job alerts')}: ${stop}`].join('\n\n');
  return {subject,html,text,listingIds:listings.map(x=>x.id)};
}
// Call only after prepareRadarJobs with current consent. Requires a trusted worker client.
// Catalog first: failed persistence must never produce an email with dead links.
export async function prepareRadarEmail(client: SupabaseClient, input: RadarEmailInput) {
  const jobs = safeJobs(input.jobs);
  const rendered = renderRadarEmail({...input,jobs});
  if (!rendered) return null;
  const records = jobs.map(job=>radarListingRecord(job));
  const {error} = await client.from('job_radar_listings').upsert(records,{onConflict:'id'}).abortSignal(AbortSignal.timeout(5000));
  if (error) throw new Error('Job Radar listing persistence failed');
  if(input.dispatchId){
    const links=await client.rpc('create_radar_attribution_links',{p_dispatch:input.dispatchId}).abortSignal(AbortSignal.timeout(5000));
    if(links.error||!Array.isArray(links.data)||links.data.length!==records.length)throw new Error('Job Radar attribution persistence failed');
    const trackingTokens:Record<string,string>={};for(const link of links.data){if(!records.some(r=>r.id===link.listing_id))throw new Error('Invalid attribution listing');trackingTokens[link.listing_id]=link.token;}
    return renderRadarEmail({...input,jobs,trackingTokens});
  }
  return rendered;
}
