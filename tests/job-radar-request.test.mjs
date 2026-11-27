import test from 'node:test';import assert from 'node:assert/strict';import {radarSameOrigin} from '../lib/job-radar-request.ts';
test('origin matches inbound host when Next reconstructs an internal hostname',()=>{
 assert.equal(radarSameOrigin('http://localhost:3120/api/radar-events','http://127.0.0.1:3120','127.0.0.1:3120'),true);
 assert.equal(radarSameOrigin('https://internal/api/radar-events','https://carvio-pi.vercel.app','carvio-pi.vercel.app'),true);
 for(const value of [null,'https://evil.example','https://carvio-pi.vercel.app/forged','null'])assert.equal(radarSameOrigin('https://carvio-pi.vercel.app/api/radar-events',value,'carvio-pi.vercel.app'),false);
});
test('a missing Origin needs same-origin Fetch Metadata or Referer, while an explicit foreign/null Origin always fails',()=>{
 const url='https://carvio-pi.vercel.app/api/radar-events',host='carvio-pi.vercel.app';
 assert.equal(radarSameOrigin(url,null,host,{site:'same-origin'}),true);
 assert.equal(radarSameOrigin(url,null,host,{referer:'https://carvio-pi.vercel.app/radar/jobs/public-id'}),true);
 assert.equal(radarSameOrigin(url,null,host,{site:'cross-site',referer:'https://evil.example/'}),false);
 assert.equal(radarSameOrigin(url,'null',host,{site:'same-origin'}),false);
 assert.equal(radarSameOrigin(url,'https://evil.example',host,{site:'same-origin'}),false);
});
