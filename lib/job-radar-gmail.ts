import {createHash} from 'node:crypto';
import {RADAR_SENDER} from './job-radar-schedule.ts';
export type RadarMessage = {subject:string;html:string;text:string};
export type GmailCredentials = {clientId:string;clientSecret:string;refreshToken:string};
export function gmailRawMessage(to: string, message: RadarMessage, dispatchId: string) {
  if (to.length>254 || !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(to) || /[\r\n]/.test(to)) throw new Error('invalid_recipient');
  if (/[\r\n]/.test(message.subject)) throw new Error('invalid_subject');
  const tag=createHash('sha256').update(dispatchId).digest('hex');
  const boundary=`carvio_${tag}`;
  const b64=(s:string)=>Buffer.from(s,'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n')||'';
  const words:string[]=[];let word='';
  for(const char of message.subject){if(Buffer.byteLength(word+char)>42){words.push(word);word='';}word+=char;}if(word)words.push(word);
  const subject=words.map(w=>'=?UTF-8?B?'+Buffer.from(w).toString('base64')+'?=').join('\r\n ');
  const raw=[`Date: ${new Date().toUTCString()}`,`From: CARVIO <${RADAR_SENDER}>`,`To: ${to}`,`Subject: ${subject}`,`Message-ID: <carvio.radar.${tag}@gmail.com>`,'MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(message.text),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(message.html),`--${boundary}--`,''].join('\r\n');
  return Buffer.from(raw).toString('base64url');
}
export class RadarSendUncertain extends Error {constructor(){super('gmail_delivery_uncertain');}}
// Called only by an explicitly enabled live worker, never by the dry-run path.
export function createRadarGmailTransport(credentials: GmailCredentials, request: typeof fetch = fetch) {
  let token='';let expires=0;let verified=false;
  async function verifySender():Promise<string> {
    verified=false;
    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) throw new Error('gmail_oauth_missing');
    if (!token || Date.now()>=expires) {
      const refresh=await request('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:credentials.refreshToken,grant_type:'refresh_token'})});
      if(!refresh.ok)throw new Error('gmail_oauth_failed');
      const result=await refresh.json();
      if(typeof result.access_token!=='string'||typeof result.expires_in!=='number'||result.expires_in<60)throw new Error('gmail_oauth_failed');
      token=result.access_token;expires=Date.now()+(result.expires_in-60)*1000;
    }
    const response=await request('https://openidconnect.googleapis.com/v1/userinfo',{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok)throw new Error('gmail_identity_unavailable');
    const profile=await response.json();
    if(profile.email!==RADAR_SENDER||profile.email_verified!==true)throw new Error('wrong_sender');
    verified=true;return profile.email;
  }
  async function send(to:string,message:RadarMessage,dispatchId:string):Promise<string> {
    // verifySender MUST precede the final DB consent gate. Expired tokens never trigger
    // a hidden refresh after that gate: fail before issuing the send request instead.
    if(!verified||!token||Date.now()>=expires)throw new Error('gmail_identity_not_verified');
    const raw=gmailRawMessage(to,message,dispatchId);
    try {
      const response=await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({raw})});
      // Never retry a Gmail POST. Timeouts, rejected/invalid responses require reconciliation.
      if(!response.ok)throw new RadarSendUncertain();
      const result=await response.json();
      if(typeof result.id!=='string'||!result.id)throw new RadarSendUncertain();
      return result.id;
    } catch {throw new RadarSendUncertain();}
  }
  return {verifySender,send};
}
