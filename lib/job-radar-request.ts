// Browser Origin is optional on same-origin requests. Fetch Metadata / Referer
// provide a same-origin fallback; neither is accepted against an explicit foreign Origin.
export function radarSameOrigin(url:string,origin:string|null,host:string|null,metadata:{site?:string|null;referer?:string|null}={}){
 try{
  const expected=host||new URL(url).host;
  if(origin!==null){const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol)&&parsed.origin===origin&&parsed.host===expected;}
  if(metadata.site==='same-origin')return true;
  if(metadata.referer){const ref=new URL(metadata.referer);return ['http:','https:'].includes(ref.protocol)&&ref.host===expected;}
  return false;
 }catch{return false;}
}
