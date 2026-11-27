import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const { chromium } = await import(process.env.CARVIO_PLAYWRIGHT_MODULE || 'playwright');
let launch={headless:true,executablePath:process.env.CARVIO_CHROMIUM_PATH || undefined,args:['--no-sandbox']};
if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:c}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={headless:true,args:c.args,executablePath:await c.executablePath()};}
const base=process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3120';
let server;
if(process.env.CARVIO_START_LOCAL_SERVER==='1'){
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3120'],{stdio:'ignore'});
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/find')).ok){ready=true;break;}}catch{}await delay(100);}
 if(!ready){server.kill();throw Error('Local test server did not start');}
}
const browser = await chromium.launch(launch);
try {
 for(const lang of ['he','en']) for(const width of [1280,390]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const offer=lang==='he'?'אנחנו נמשיך לחפש בשבילך!':'We’ll keep searching for you!';
  const manage=lang==='he'?'Job Radar · ניהול התראות משרות':'Job Radar · Manage job alerts';
  await page.goto(`${base}/find?lang=${lang}`);
  assert.equal(await page.getByRole('heading',{name:offer,exact:true}).count(),0);
  await page.getByRole('button',{name:manage,exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(text=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent===text&&!b.disabled),manage);
  const url=`${base}/find?${new URLSearchParams({lang,q:'Recruitment Manager',country:'Israel',city:'Tel Aviv',searchedAt:'2026-11-27T09:00:00Z'})}`;
  await page.goto(url);
  await page.getByRole('heading',{name:offer,exact:true}).waitFor();
  await page.getByRole('button',{name:lang==='he'?'כן, חפשו בשבילי!':'Yes, search for me!',exact:true}).click();
  await page.getByRole('combobox',{name:lang==='he'?'כמה פעמים בשבוע?':'How often?'}).selectOption('2');
  await page.getByRole('button',{name:lang==='he'?'הפעלה ושמירה':'Enable and save',exact:true}).click();
  await page.getByRole('status').filter({hasText:lang==='he'?'כדי לשמור התראות':'To save alerts'}).waitFor();
  const box=await page.getByRole('region',{name:'Job Radar',exact:true}).boundingBox();
  assert.ok(box&&box.width<=width&&box.x>=0);
  await page.getByRole('button',{name:lang==='he'?'סגירה':'Close',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:manage,exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:offer,exact:true}).count(),0);
  await context.close();
  console.log(`PASS ${lang} ${width}px: initial suppression, search invitation, editor, frequency, guest consent block, reload suppression and section width`);
 }
} finally {await browser.close();server?.kill();}
