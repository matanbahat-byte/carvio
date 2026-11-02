import test from 'node:test';
import assert from 'node:assert/strict';
import {linkedOutreachContact} from '../lib/contact-links.ts';
const wrong={id:'wrong',name:'Dana',email:'wrong@example.com',company:'Other'};
const right={id:'right',name:'Dana',email:'right@example.com',company:'Target'};
test('same name never supplies an unrelated contact email',()=>{
 assert.equal(linkedOutreachContact({id:'a',contactName:'Dana'},[wrong,right]),undefined);
 assert.strictEqual(linkedOutreachContact({id:'a',contactName:'Dana',linkedContactIds:['right']},[wrong,right]),right);
});
test('explicit contact order takes precedence over contact-list order and reverse links',()=>{
 assert.strictEqual(linkedOutreachContact({id:'a',linkedContactIds:['right','wrong']},[{...wrong,linkedApplicationId:'a'},right]),right);
 assert.strictEqual(linkedOutreachContact({id:'a',linkedContactIds:['deleted','right']},[wrong,right]),right);
});
test('only an unambiguous reverse ID link can be used as fallback',()=>{
 const linked={...right,linkedApplicationId:'a'};
 assert.strictEqual(linkedOutreachContact({id:'a'},[wrong,linked]),linked);
 assert.equal(linkedOutreachContact({id:'a'},[{...wrong,linkedApplicationId:'a'},linked]),undefined);
 assert.equal(linkedOutreachContact({id:'b'},[wrong,linked]),undefined);
});
