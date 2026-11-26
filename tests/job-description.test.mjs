import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanJobDescription} from '../lib/job-description.ts';
test('decodes nested markup before removing tags and scripts, preserving list boundaries',()=>{
 assert.equal(cleanJobDescription('&amp;lt;h2&amp;gt;Requirements&amp;lt;/h2&amp;gt;&amp;lt;li&amp;gt;SQL &amp;amp; Excel&amp;lt;/li&amp;gt;<script>alert(1)</script><style>body{color:red}</style>'),'Requirements\nSQL & Excel');
});
test('numeric entities, malformed entities and code fragments are bounded and safe plain text',()=>{
 assert.equal(cleanJobDescription('&#x5e0;&#1497;&#1505;&#1497;&#1493;&#1503; &nbsp;SQL'),'ניסיון SQL');
 assert.doesNotThrow(()=>cleanJobDescription('&#999999999;'));
 assert.equal(cleanJobDescription('Requirements\nconst required = "fake";\nPython'),'Requirements\nPython');
 assert.ok(cleanJobDescription('a'.repeat(200000)).length<=20000);
});
