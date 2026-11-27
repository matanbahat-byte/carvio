import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {renderRadarEmail} from '../lib/job-radar-email.ts';
import {emailFixtureJobs} from './fixtures/job-radar-email.mjs';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE || 'playwright');
let launch={headless:true};
if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={headless:true,args:c.args,executablePath:await c.executablePath()};}
const base=process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3120';
let server;
if(process.env.CARVIO_START_LOCAL_SERVER==='1') {
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3120'],{stdio:'ignore'});
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/find')).ok){ready=true;break;}}catch{}await delay(100);}
 if(!ready){server.kill();throw Error('Local preview server unavailable');}
}
const browser=await chromium.launch(launch);
try {
 for(const language of ['he','en']) for(const width of [1280,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}});
  const page=await context.newPage();
  const email=renderRadarEmail({language,jobs:emailFixtureJobs,displayName:language==='he'?'דנה':'Dana',origin:base});
  await page.setContent(email.html);
  assert.equal(await page.locator('h2').count(),5);
  assert.equal(await page.locator('html').getAttribute('dir'),language==='he'?'rtl':'ltr');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('h2').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)));
  const links=[...new Set(await page.locator('a').evaluateAll(nodes=>nodes.map(a=>a.href)))];
  assert.equal(links.length,7);
  await page.screenshot({path:`/tmp/carvio-email-${language}-${width}.png`,fullPage:true});
  let mutations=0;
  page.on('request',r=>{if(r.method()!=='GET'&&r.url().includes('/rest/v1/rpc/'))mutations++;});
  const jobLinks=links.filter(u=>new URL(u).pathname.startsWith('/radar/jobs/'));
  for(let i=0;i<jobLinks.length;i++) {
   const response=await page.goto(jobLinks[i]);assert.equal(response.status(),200);
   await page.getByRole('heading',{name:emailFixtureJobs[i].title,exact:true}).waitFor();
   const source=page.getByRole('link',{name:language==='he'?'לפרטים ולהגשת מועמדות באתר המקור':'View details and apply on the source site',exact:true});
   assert.equal(await source.getAttribute('href'),emailFixtureJobs[i].url);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  for(const url of links.filter(u=>new URL(u).pathname==='/radar/preferences')) {
   const response=await page.goto(url);assert.equal(response.status(),200);
   await page.getByRole('button',{name:language==='he'?'הפעלה ושמירה':'Enable and save',exact:true}).waitFor();
   await page.getByRole('link',{name:language==='he'?'כניסה לסביבת העבודה להתחברות':'Open workspace to sign in',exact:true}).waitFor();
  }
  assert.equal(mutations,0,'Opening email links must not mutate consent');
  await page.goto(`${base}/radar/jobs/${'f'.repeat(64)}?lang=${language}`);
  await page.getByRole('heading',{name:language==='he'?'המשרה אינה זמינה כרגע':'This job is currently unavailable',exact:true}).waitFor();
  console.log(`PASS ${language} ${width}px: five cards, no overflow, five matching job pages, both settings links, guest login guard, no GET-triggered consent changes and missing-job state`);
  await context.close();
 }
} finally {await browser.close();server?.kill();}
