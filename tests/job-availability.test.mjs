import test from 'node:test';
import assert from 'node:assert/strict';
import { availabilityTarget, checkJobAvailability } from '../lib/job-availability.ts';
const url = 'https://job-boards.greenhouse.io/example/jobs/123';
const json = data => Response.json(data);
test('only fixed public ATS hosts and exact job routes can trigger requests', () => {
  for (const input of ['http://boards.greenhouse.io/example/jobs/123', 'https://127.0.0.1/jobs/123', 'https://boards.greenhouse.io.attacker.test/example/jobs/123', 'https://user:pass@boards.greenhouse.io/example/jobs/123', 'https://boards.greenhouse.io:443/example/jobs/../123', 'https://boards.greenhouse.io/%2e%2e/jobs/123', 'https://jobs.lever.co/example/apply', 'https://linkedin.com/jobs/view/123']) assert.equal(availabilityTarget(input), null, input);
  assert.equal(new URL(availabilityTarget(url).detail).hostname, 'boards-api.greenhouse.io');
  assert.equal(new URL(availabilityTarget('https://jobs.eu.lever.co/example/12345678-abcd-abcd-abcd-123456789012').detail).hostname, 'api.eu.lever.co');
});
test('published requires matching structured job identity and title', async () => {
  const result = await checkJobAvailability(url, async (target, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.equal(target, 'https://boards-api.greenhouse.io/v1/boards/example/jobs/123?content=true');
    return json({id:123,title:' Electronics Engineer ',company_name:'Example Engineering',location:{name:'Haifa'}});
  });
  assert.equal(result.status, 'published'); assert.ok(Date.parse(result.checkedAt));
  assert.deepEqual(result.details, {role:'Electronics Engineer',company:'Example Engineering',location:'Haifa',descriptionStatus:'missing'});
  assert.equal((await checkJobAvailability(url, async () => json({id:456,title:'Other'}))).status, 'unknown');
});
test('404 alone never proves closure; a valid board must also omit the posting', async () => {
  let calls = 0;
  assert.equal((await checkJobAvailability(url, async () => ++calls === 1 ? new Response(null,{status:404}) : json({jobs:[{id:456}]}))).status, 'not-published');
  calls = 0;
  assert.equal((await checkJobAvailability(url, async () => ++calls === 1 ? new Response(null,{status:404}) : json({jobs:[{id:123}]}))).status, 'published');
  assert.equal((await checkJobAvailability(url, async () => new Response(null,{status:404}))).status, 'unknown');
});
test('blocked, redirected, malformed and unavailable sources remain unknown', async () => {
  for (const status of [301,403,429,500]) assert.equal((await checkJobAvailability(url, async () => new Response(null,{status}))).status,'unknown');
  assert.equal((await checkJobAvailability(url, async () => {throw new Error('timeout');})).status,'unknown');
  assert.equal((await checkJobAvailability(url, async () => new Response('<html>Sign in</html>'))).status,'unknown');
  let calls = 0;
  assert.equal((await checkJobAvailability(url, async () => ++calls === 1 ? new Response(null,{status:410}) : json({error:'not a board'}))).status,'unknown');
  assert.equal((await checkJobAvailability(url, async () => json({id:123,title:'x',payload:'x'.repeat(2_000_001)}))).status,'unknown');
});
test('unsupported destinations are not fetched and Lever matches posting IDs', async () => {
  assert.equal((await checkJobAvailability('https://example.com/job', async () => {throw new Error('Must not fetch');})).reason,'unsupported');
  const id = '12345678-abcd-abcd-abcd-123456789012';
  const result = await checkJobAvailability(`https://jobs.lever.co/example/${id}`, async () => json({id,text:'Engineer',categories:{location:'Tel Aviv'}}));
  assert.equal(result.status,'published');
  assert.deepEqual(result.details, {role:'Engineer',company:'',location:'Tel Aviv',descriptionStatus:'missing'});
});

test('unconfirmed identities and board-only availability do not supply autofill details', async () => {
  const wrong = await checkJobAvailability(url, async () => json({id:456,title:'Other role',company_name:'Other company'}));
  assert.equal(wrong.details, undefined);
  let calls = 0;
  const boardOnly = await checkJobAvailability(url, async () => ++calls === 1
    ? new Response(null,{status:404})
    : json({jobs:[{id:123,title:'Board title'}]}));
  assert.equal(boardOnly.status, 'published');
  assert.equal(boardOnly.details, undefined);
});


test('verified Greenhouse HTML is converted into bounded plain-text JD', async () => {
  const result = await checkJobAvailability(url, async () => json({id:123,title:'Engineer',content:'<h2>Responsibilities</h2><p>Build &amp; test</p><script>alert(1)</script>'}));
  assert.equal(result.status,'published');
  assert.equal(result.details.jobDescription,'Responsibilities\nBuild & test');
});
test('verified Lever plain description is preserved, unknown listings never supply JD', async () => {
  const id = '12345678-abcd-abcd-abcd-123456789012';
  const good = await checkJobAvailability(`https://jobs.lever.co/example/${id}`,async () => json({id,text:'Engineer',descriptionPlain:'  Work with teams  '}));
  assert.equal(good.details.jobDescription,'Work with teams');
  const wrong = await checkJobAvailability(url,async () => json({id:999,title:'Engineer',content:'Secret'}));
  assert.equal(wrong.details,undefined);
});
test('Lever imports all sections and source organization metadata without guessing',async()=>{
 const id='12345678-abcd-abcd-abcd-123456789012',url=`https://jobs.lever.co/example/${id}`;
 const result=await checkJobAvailability(url,async target=>target===url?new Response('<script type="application/ld+json">{"@type":"JobPosting","hiringOrganization":{"name":"Verified Employer"}}</script>',{headers:{'content-type':'text/html'}}):json({id,text:'Engineer',descriptionPlain:'About us\nOur company introduction.',lists:[{text:'What We Require',content:'<ul><li>3 years of experience</li><li>SQL</li></ul>'}],additionalPlain:'Marketing and benefits.'}));
 assert.equal(result.details.company,'Verified Employer');assert.equal(result.details.descriptionStatus,'available');
 assert.match(result.details.jobDescription,/Our company introduction/);assert.match(result.details.jobDescription,/SQL/);assert.match(result.details.jobDescription,/Marketing and benefits/);
});
test('intro-only Lever descriptions are explicitly partial and company is never guessed from the board slug',async()=>{
 const id='12345678-abcd-abcd-abcd-123456789012';const result=await checkJobAvailability(`https://jobs.lever.co/not-a-company-name/${id}`,async()=>json({id,text:'Engineer',descriptionPlain:'About us\nWe build a better future for everyone.'}));
 assert.equal(result.details.descriptionStatus,'partial');assert.equal(result.details.company,'');
});
