import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {messageProvenance,messageInputsChanged} from '../lib/message-provenance.ts';
import {MessageTrustCard} from '../components/message-trust-card.ts';
const profile={recipientType:'Recruiter',tone:'Warm & professional',intent:'Request a conversation',recipientName:'TEST Dana',recipientEmail:'test@example.com',company:'TEST Company',role:'',senderName:'',context:'A specific question about team work',value:'',recipientRole:'Recruiter',relationship:'Referral'};
test('generation provenance includes only nonempty fields actually used by the template',()=>{
 const before=JSON.stringify(profile); const snapshot=messageProvenance(profile,'en');
 assert.deepEqual(Object.keys(snapshot.inputs),['intent','tone','recipientType','recipientName','company','context']);
 assert.equal(JSON.stringify(profile),before);
 assert.equal(messageInputsChanged(snapshot,{...profile,recipientEmail:'other@example.com'},'en'),false);
 assert.equal(messageInputsChanged(snapshot,{...profile,role:'Analyst'},'en'),true);
 assert.equal(messageInputsChanged(snapshot,profile,'he'),true);
 assert.ok(!('recipientType' in messageProvenance({...profile,intent:'Thank them'},'en').inputs));
});
test('snapshot is stable after edits and both language cards disclose stale inputs and manual editing',()=>{
 const current={...profile};const snapshot=messageProvenance(current,'en');current.company='Different';
 assert.equal(snapshot.inputs.company,'TEST Company');
 for(const language of ['en','he']) {
  const html=renderToStaticMarkup(createElement(MessageTrustCard,{snapshot,changed:true,edited:true,language}));
  assert.match(html,/role="status"/);assert.ok(html.includes(language==='he'?'לא עודכנו אוטומטית':'not updated automatically'));
  assert.ok(html.includes(language==='he'?'נערכו ידנית':'manually edited'));
  assert.ok(!html.includes('test@example.com'));
 }
});
