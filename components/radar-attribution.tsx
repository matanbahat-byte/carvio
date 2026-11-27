'use client';
import {emitProductEvent} from '@/lib/product-analytics';
import {useEffect} from 'react';
import {createClient} from '@/lib/supabase/client';
const KEY='carvio.radar.attribution.v1';
type Entry={token:string;expires:number};
export function RadarAttribution({token,workspace=false}:{token?:string;workspace?:boolean}){
 useEffect(()=>{
  let stopped=false;let running=false;let pending=false;
  const read=():Entry[]=>{try{const x=JSON.parse(sessionStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.filter(e=>typeof e.token==='string'&&Number.isFinite(e.expires)&&e.expires>Date.now()).slice(-10):[];}catch{return [];}};
  if(token&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token)){
   try{const entries=read();if(!entries.some(e=>e.token===token))entries.push({token,expires:Date.now()+7*86400000});sessionStorage.setItem(KEY,JSON.stringify(entries.slice(-10)));const url=new URL(location.href);url.searchParams.delete('r');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch{/* Attribution must never interrupt the application. */}
  }
  const client=createClient();
  const record=async()=>{
   if(stopped||document.visibilityState!=='visible')return;
   if(running){pending=true;return;}
   running=true;
   try{
    // The same-origin server verifies the account, consent and token ownership.
    // Do not block attribution on a second browser-to-Auth round trip.
    for(const entry of read())for(const event of workspace?['clicked','returned','saved','applied']:['clicked']){
     if(stopped)return;const response=await fetch('/api/radar-events',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({token:entry.token,event}),signal:AbortSignal.timeout(15000)});
     if(event==='clicked'&&response.ok&&(await response.json()).recorded===true){emitProductEvent('radar_visit_verified',{method:'job_radar'});}
    }
   }catch{/* Analytics failures never block save, navigation or sign-in. */}finally{running=false;if(pending&&!stopped){pending=false;void record();}}
  };
  void record();
  const subscription=client?.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){try{sessionStorage.removeItem(KEY);}catch{}}else if(event==='SIGNED_IN')queueMicrotask(()=>void record());}).data.subscription;
  const changed=()=>void record();document.addEventListener('visibilitychange',changed);window.addEventListener('carvio:radar-workspace-saved',changed);
  return()=>{stopped=true;subscription?.unsubscribe();document.removeEventListener('visibilitychange',changed);window.removeEventListener('carvio:radar-workspace-saved',changed);};
 },[token,workspace]);
 return null;
}
