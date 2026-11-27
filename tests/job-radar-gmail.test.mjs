import test from 'node:test';
import assert from 'node:assert/strict';
import {createRadarGmailTransport,gmailRawMessage} from '../lib/job-radar-gmail.ts';
const credentials={clientId:'fixture-id',clientSecret:'fixture-secret',refreshToken:'fixture-token'};
const message={subject:'משרות חדשות לחיפוש שלך | CARVIO',text:'שלום דנה',html:'<p>שלום דנה</p>'};
test('MIME fixes From, escapes headers, preserves UTF-8 alternatives, and contains no CC/BCC',()=>{
 const raw=Buffer.from(gmailRawMessage('fixture@example.test',message,'fixture-dispatch'),'base64url').toString();
 assert.match(raw,/From: CARVIO <carvio.team@gmail.com>/);assert.match(raw,/multipart\/alternative/);assert.match(raw,/text\/html; charset=UTF-8/);assert.doesNotMatch(raw,/\r\n(?:Cc|Bcc):/);
 for(const word of raw.match(/=\?UTF-8\?B\?[^?]+\?=/g))assert.ok(word.length<=75);
 assert.throws(()=>gmailRawMessage('fixture@example.test\r\nBcc: evil@example.test',message,'x'),/invalid_recipient/);
 assert.throws(()=>gmailRawMessage('fixture@example.test',{...message,subject:'Hello\r\nBcc: evil'},'x'),/invalid_subject/);
});
test('only the exact OAuth-verified CARVIO identity can use the mocked Gmail endpoint',async()=>{
 const calls=[];
 const fake=async(url,options)=>{calls.push({url,options});if(url.includes('/token'))return Response.json({access_token:'fixture-access',expires_in:3600});if(url.includes('/userinfo'))return Response.json({email:'carvio.team@gmail.com',email_verified:true});return Response.json({id:'fixture-provider-id'});};
 const t=createRadarGmailTransport(credentials,fake);await assert.rejects(t.send('fixture@example.test',message,'x'),/not_verified/);
 assert.equal(await t.verifySender(),'carvio.team@gmail.com');assert.equal(await t.send('fixture@example.test',message,'x'),'fixture-provider-id');
 assert.equal(calls.filter(x=>x.url.endsWith('/messages/send')).length,1);
 const raw=JSON.parse(calls.at(-1).options.body).raw;assert.match(Buffer.from(raw,'base64url').toString(),/carvio.team@gmail.com/);
});
test('wrong sender, missing credentials, or unverified identity never reaches even the fake send endpoint',async()=>{
 for(const profile of [{email:'matan@example.test',email_verified:true},{email:'carvio.team@gmail.com',email_verified:false}]){
  let sends=0;const t=createRadarGmailTransport(credentials,async url=>{if(url.includes('/token'))return Response.json({access_token:'fixture',expires_in:3600});if(url.includes('/userinfo'))return Response.json(profile);sends++;return Response.json({id:'must-not-send'});});
  await assert.rejects(t.verifySender(),/wrong_sender/);await assert.rejects(t.send('fixture@example.test',message,'x'),/not_verified/);assert.equal(sends,0);
 }
 const missing=createRadarGmailTransport({clientId:'',clientSecret:'',refreshToken:''},async()=>{throw Error('must not request');});await assert.rejects(missing.verifySender(),/oauth_missing/);
});
test('mock timeout and malformed acceptance are uncertain, with exactly one POST and no retry',async()=>{
 for(const fail of [()=>{throw Error('fixture timeout');},()=>Response.json({})]){
  let sends=0;const t=createRadarGmailTransport(credentials,async url=>{if(url.includes('/token'))return Response.json({access_token:'fixture',expires_in:3600});if(url.includes('/userinfo'))return Response.json({email:'carvio.team@gmail.com',email_verified:true});sends++;return fail();});
  await t.verifySender();await assert.rejects(t.send('fixture@example.test',message,'x'),/uncertain/);assert.equal(sends,1);
 }
});
