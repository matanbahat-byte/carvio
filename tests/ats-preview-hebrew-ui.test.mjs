import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../app/ats-preview/page.tsx',import.meta.url),'utf8');
test('preview form has exactly one search submit and three Hebrew inputs',()=>{
 for(const label of ['איזו משרה מחפשים?','מדינה','עיר (לא חובה)','חיפוש משרות']) assert.ok(source.includes(label),label);
 assert.equal((source.match(/type="submit"/g)||[]).length,1);
 for(const field of ['q','country','city']) assert.ok(source.includes('name="'+field+'"'),field);
 assert.ok(source.includes('dir="rtl"'));
});
test('preview does not fetch or display general jobs before search',()=>{
 assert.ok(source.includes('const hasSearch = Boolean(q || country || city || location)'));
 assert.ok(source.includes('hasSearch ? await Promise.all'));
 assert.ok(source.includes('!hasSearch &&'));
});
