import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.CARVIO_PLAYWRIGHT_MODULE || 'playwright');
let launch={headless:true};
if(process.env.CARVIO_CHROMIUM_PACKAGE){const {default:binary}=await import(process.env.CARVIO_CHROMIUM_PACKAGE);launch={...launch,args:binary.args,executablePath:await binary.executablePath()};}
const base=process.env.CARVIO_BASE_URL || 'http://127.0.0.1:3120';
const output=process.env.CARVIO_VISUAL_OUTPUT || 'artifacts/visual/after';
const report=[];await mkdir(output,{recursive:true});
const browser=await chromium.launch(launch);
try{
for(const language of ['en','he'])for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const name=`${language}-${viewport.width}`;
 const context=await browser.newContext({viewport,colorScheme:'dark',reducedMotion:'reduce'});
 await context.addInitScript(locale=>{for(const storage of [localStorage,sessionStorage]){storage.setItem('carvio.language.v1',JSON.stringify(locale));for(const version of ['v1','v2']){storage.setItem(`carvio.theme.${version}`,'"plum"');storage.setItem(`carvio.theme-explicit.${version}`,'true');}}},language);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const capture=async label=>{
  await page.screenshot({path:`${output}/${name}-${label}.png`,fullPage:true,animations:'disabled'});
  const scan=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const parse=value=>{const m=value.match(/^rgba?\(([^)]+)\)/);if(!m){if(!ctx||!value)return null;ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const p=ctx.getImageData(0,0,1,1).data;return [p[0],p[1],p[2],p[3]/255];}const v=m[1].split(/[, /]+/).filter(Boolean).map(Number);return v.length>=3?[v[0],v[1],v[2],v[3]??1]:null;};
   const blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
   const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const contrast=[],purple=[];
   for(const el of document.querySelectorAll('body *')){
    if(!(el instanceof HTMLElement)||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
    const rect=el.getBoundingClientRect();if(rect.width<1||rect.height<1)continue;
    const style=getComputedStyle(el);
    for(const property of ['color','backgroundColor']){
     const c=parse(style[property]);if(!c||c[3]<.1)continue;
     const max=Math.max(...c.slice(0,3)),min=Math.min(...c.slice(0,3)),d=max-min;if(d<30)continue;
     let h=(max===c[0]?(c[1]-c[2])/d+(c[1]<c[2]?6:0):max===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4)*60;
     if(h>235&&h<335)purple.push({tag:el.tagName,class:el.className,color:style[property]});
    }
    if(!el.textContent?.trim()||el.children.length||el.closest('button:disabled,[aria-disabled="true"],svg'))continue;
    const fg=parse(style.color);if(!fg||fg[3]===0)continue;
    let node=el,layers=[],gradient=false;
    while(node){const cs=getComputedStyle(node);if(cs.backgroundImage!=='none'){gradient=true;break;}const color=parse(cs.backgroundColor);if(color)layers.push(color);if(color?.[3]===1)break;node=node.parentElement;}
    if(gradient)continue;
    let bg=[255,255,255];for(const layer of layers.reverse())bg=blend(layer,bg);const color=blend(fg,bg);
    const a=luminance(color),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const size=parseFloat(style.fontSize),large=size>=24||(size>=18.66&&parseInt(style.fontWeight)>=700),minimum=large?3:4.5;
    if(ratio+.05<minimum)contrast.push({text:el.textContent.trim().slice(0,85),ratio:+ratio.toFixed(2),color:style.color,bg:bg.map(Math.round),class:el.className});
   }
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,theme:document.documentElement.dataset.carvioTheme,contrast,purple};
  });
  report.push({name,label,...scan});
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
 };
 const navigate=async index=>{
  if(viewport.width>=768)await page.locator('.calm-desktop-nav .calm-nav-button').nth(index).click();
  else if(index<4)await page.locator('.calm-mobile-nav button').nth(index).click();
  else{await page.locator('.calm-mobile-nav button').nth(4).click();await page.locator('.mobile-more-menu button').nth(index===4?1:2).click();}
 };
 const closeDialog=async()=>{await page.keyboard.press('Escape');const dialog=page.getByRole('dialog').filter({visible:true}).last();if(await dialog.isVisible().catch(()=>false)){const close=dialog.getByRole('button',{name:/close|סגיר/i}).first();if(await close.isVisible().catch(()=>false))await close.click();}};
 await page.goto(`${base}/`);await page.locator('.carvio-welcome').waitFor();await capture('landing');
 await page.goto(`${base}/?workspace=1&demo=1`);await page.locator('.calm-mobile-nav').waitFor({state:'attached'});
 if(!process.env.CARVIO_VISUAL_REPORT_ONLY)assert.equal(await page.evaluate(()=>document.documentElement.dataset.carvioTheme),'light',name+': legacy theme overrode light');
 const storedData=await page.evaluate(()=>Object.fromEntries(['carvio.applications.v1','carvio.contacts.v1','carvio.resumes.v1'].map(key=>[key,sessionStorage.getItem(key)])));
 for(const [index,label] of ['home','applications','search','networking','tools','insights'].entries()){
  if(index)await navigate(index);await capture(label);
  if(index===0){const why=page.locator('.recommendation-why-trigger');if(await why.isVisible().catch(()=>false)){await why.click();await capture('recommendation-explanation');await why.click();}const saved=page.getByRole('button',{name:/^Open in tracker$|^פתיחה במעקב$/}).first();if(await saved.isVisible().catch(()=>false)){await saved.click();await page.getByRole('dialog').last().waitFor();await capture('saved-job-evidence');await closeDialog();}}
  if(index===1||index===3){const button=page.getByRole('button',{name:index===1?/^Add application$|^הוספת מועמדות$/:/^Add contact$|^הוספת איש קשר$/}).first();await button.click();await page.getByRole('dialog').last().waitFor();await capture(label+'-form');await closeDialog();}
  if(index===4)for(let tool=0;tool<5;tool++){await page.locator('.tools-picker button').nth(tool).click();await capture('tool-'+tool);}
 }
 // Settings, privacy and feedback dialogs use existing navigation only.
 if(viewport.width>=768)await page.getByRole('button',{name:/^Settings and backup$|^הגדרות וגיבוי$/}).first().click();
 else{await page.locator('.calm-mobile-nav button').nth(4).click();await page.locator('.mobile-more-menu button').last().click();}
 await capture('settings');
 for(const [index,label] of [[1,'privacy'],[2,'feedback']]){await page.locator('.calm-setting-button').nth(index).click();await capture(label);await closeDialog();}
 await navigate(0);await page.getByRole('button',{name:language==='he'?'צבעים ונגישות':'Colors and accessibility'}).click();await capture('appearance');await page.getByRole('button',{name:language==='he'?'צבעים ונגישות':'Colors and accessibility'}).click();
 if(viewport.width<768){await page.locator('.calm-mobile-nav button').nth(5).click();await capture('quick-add');await page.keyboard.press('Escape');}
 await page.reload();await page.locator('.calm-mobile-nav').waitFor({state:'attached'});
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(['carvio.applications.v1','carvio.contacts.v1','carvio.resumes.v1'].map(key=>[key,sessionStorage.getItem(key)]))),storedData,name+': visual navigation changed saved data');
 await page.goto(`${base}/find?q=Software+Engineer&country=Israel&city=Tel+Aviv&lang=${language}`);await capture('public-search');assert.equal(await page.locator('main').getAttribute('dir'),language==='he'?'rtl':'ltr');
 assert.deepEqual(errors,[],name+': uncaught browser errors');
 await context.close();
}
await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({states:report.length,overflow:report.filter(x=>x.scrollWidth>x.width+1).length,purple:report.reduce((n,x)=>n+x.purple.length,0),contrast:report.reduce((n,x)=>n+x.contrast.length,0),findings:report.filter(x=>x.contrast.length||x.purple.length||x.scrollWidth>x.width+1)},null,2));
if(!process.env.CARVIO_VISUAL_REPORT_ONLY){assert.ok(report.every(x=>x.scrollWidth<=x.width+1),'Horizontal overflow detected');assert.ok(report.every(x=>x.purple.length===0),'Purple styling remains');assert.ok(report.every(x=>x.contrast.length===0),'Unreadable text contrast detected; see report.json');}
}finally{await browser.close();}
