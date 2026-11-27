import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRadarEmail,radarListingRecord,validRadarListing,prepareRadarEmail} from '../lib/job-radar-email.ts';
const make=(n,patch={})=>({id:`greenhouse:fixture:${n}`,title:'Recruitment Manager',company:'Example company',location:'Tel Aviv, Israel',url:`https://boards.greenhouse.io/fixture/jobs/${n}`,provider:'greenhouse',postedAt:'2026-11-26T00:00:00Z',...patch});
const links=html=>[...html.matchAll(/href="([^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&')));
test('both languages render three real job cards, internal links, text alternative, settings and stop links',()=>{
 for(const language of ['he','en']) {
  const email=renderRadarEmail({jobs:Array.from({length:8},(_,i)=>make(i+1)),language,displayName:'Dana'});
  assert.equal(email.listingIds.length,3);assert.equal((email.html.match(/<h2 /g)||[]).length,3);
  assert.match(email.html,new RegExp(`lang="${language}" dir="${language==='he'?'rtl':'ltr'}"`));
  assert.ok(email.text.includes('Recruitment Manager\nExample company\nTel Aviv, Israel'));
  for(const url of links(email.html)) {
   assert.equal(url.origin,'https://carvio-pi.vercel.app');assert.equal(url.searchParams.get('lang'),language);
   assert.ok([...url.searchParams.keys()].every(key=>['lang','action'].includes(key)));
   assert.ok(/^\/radar\/(jobs\/[a-f0-9]{64}|preferences)$/.test(url.pathname));
  }
  assert.ok(links(email.html).some(u=>u.searchParams.get('action')==='stop'));
  assert.doesNotMatch(email.html,/newsletter|mailing list|ניוזלטר|דיוור|<script/i);
 }
});
test('escapes untrusted display names, titles and company; never includes personal details in links',()=>{
 const email=renderRadarEmail({language:'en',displayName:'Dana <img src=x onerror=alert(1)> private@example.test',jobs:[make(1,{title:'R&D <script>alert(1)</script>',company:'"Example" & Co'})]});
 assert.doesNotMatch(email.html.replace(/<img[^>]*>/g,''),/<script|<img/);assert.match(email.html,/R&amp;D &lt;script&gt;/);assert.match(email.html,/&quot;Example&quot; &amp; Co/);
 assert.ok(links(email.html).every(u=>!u.href.includes('private')&&!u.href.includes('@')));
});
test('skips empty, duplicate, search and malformed job links; does not produce an empty email',()=>{
 assert.equal(renderRadarEmail({language:'he',jobs:[]}),null);
 assert.equal(renderRadarEmail({language:'he',jobs:[make(1,{url:'https://linkedin.com/jobs/search/'})]}),null);
 const mail=renderRadarEmail({language:'en',jobs:[make(1),make(1,{url:make(1).url+'?source=x'}),make(2)]});assert.equal(mail.listingIds.length,2);
 assert.throws(()=>renderRadarEmail({language:'en',jobs:[make(1)],origin:'https://evil.example'}),/Unapproved/);
});
test('stable public catalog IDs only depend on source posting, and malformed catalog links fail closed',()=>{
 const a=radarListingRecord(make(1));const b=radarListingRecord(make(1));
 assert.equal(a.id,b.id);assert.match(a.id,/^[a-f0-9]{64}$/);assert.ok(validRadarListing(a));
 assert.equal(validRadarListing({...a,source_url:'javascript:alert(1)'}),false);
 assert.equal(validRadarListing({...a,id:'a'.repeat(64)}),false);
 assert.ok(!Object.keys(a).some(key=>/user|email|recipient|preference/.test(key)));
});
test('catalog persists all selected job pages before composing; failed writes never return a ready email',async()=>{
 let rows;
 const client=error=>({from:table=>{assert.equal(table,'job_radar_listings');return {upsert(data){rows=data;return {abortSignal:async()=>({error})};}};}});
 const email=await prepareRadarEmail(client(null),{language:'he',jobs:[make(1),make(2)]});
 assert.deepEqual(rows.map(r=>r.id),email.listingIds);
 await assert.rejects(prepareRadarEmail(client({message:'denied'}),{language:'he',jobs:[make(1)]}),/persistence failed/);
});
test('tracking adds only an opaque token and language; invalid tokens cannot become URLs',()=>{
 const job=make(1);const id=radarListingRecord(job).id;const token='11111111-1111-4111-8111-111111111111';
 const email=renderRadarEmail({language:'he',jobs:[job],displayName:'private@example.test',trackingTokens:{[id]:token}});
 const tracked=links(email.html).filter(u=>u.pathname.includes('/jobs/'));assert.ok(tracked.every(u=>u.searchParams.get('r')===token));assert.ok(tracked.every(u=>[...u.searchParams.keys()].every(k=>['lang','r'].includes(k))));
 assert.throws(()=>renderRadarEmail({language:'en',jobs:[job],trackingTokens:{[id]:'private@example.test'}}),/Invalid attribution/);
});

test('brand illustration uses one embedded CID image with no remote request or tracking query',()=>{
 const mail=renderRadarEmail({language:'he',jobs:[make(1)]});
 const images=[...mail.html.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
 assert.equal(images.length,1);assert.equal(images[0][1],'cid:carvio-illustration@carvio');
 assert.match(images[0][0],/alt=""/);assert.match(images[0][0],/width="280"/);assert.match(images[0][0],/height:auto/);
 assert.ok(mail.text.includes('Recruitment Manager'));
});

test('both Gmail send formats attach the small brand illustration with matching Content-ID',async()=>{
 const {gmailRawMessage,radarGmailPayload}=await import('../lib/job-radar-gmail.ts');
 const message=renderRadarEmail({language:'he',jobs:[make(1),make(2),make(3)]});
 const raw=Buffer.from(gmailRawMessage('pilot@example.test',message,'illustration-test'),'base64url').toString();
 assert.match(raw,/Content-Type: multipart\/related/);assert.match(raw,/Content-ID: <carvio-illustration@carvio>/);assert.match(raw,/Content-Disposition: inline/);
 const mime=radarGmailPayload(message);assert.equal(mime.mime_type,'multipart/related');assert.equal(mime.parts[1].content_id,'<carvio-illustration@carvio>');
 const bytes=Buffer.from(mime.parts[1].body.base64_url_content,'base64url');assert.ok(bytes.length<50000);assert.equal(bytes.subarray(0,2).toString('hex'),'ffd8');
});
