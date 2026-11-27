import test from 'node:test';import assert from 'node:assert/strict';import {parseAuthReturn} from '../lib/auth-return.ts';
const now=Date.parse('2026-11-27T10:00:00Z');
test('return marker accepts only local application IDs and supported language within one day',()=>{
 assert.deepEqual(parseAuthReturn(JSON.stringify({applicationId:'app-123',language:'he',expiresAt:now+1000}),now),{applicationId:'app-123',language:'he',expiresAt:now+1000});
 for(const x of [{applicationId:'https://evil.test',language:'he',expiresAt:now+1000},{applicationId:'app',language:'fr',expiresAt:now+1000},{applicationId:'app',language:'en',expiresAt:now-1},{applicationId:'app',language:'en',expiresAt:now+86400001}])assert.equal(parseAuthReturn(JSON.stringify(x),now),null);
 assert.equal(parseAuthReturn('{broken',now),null);
});
