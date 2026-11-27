// Same-device return marker only. No email, job URL or personal data in redirect URLs.
export const AUTH_RETURN_KEY='carvio.auth-return.v1';
export type AuthReturn={applicationId:string;language:'he'|'en';expiresAt:number};
export function parseAuthReturn(value:string|null,now=Date.now()):AuthReturn|null{
 try{const x=JSON.parse(value||'null');return x&&typeof x.applicationId==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(x.applicationId)&&['he','en'].includes(x.language)&&Number.isFinite(x.expiresAt)&&x.expiresAt>now&&x.expiresAt<=now+86400000?x:null;}catch{return null;}
}
