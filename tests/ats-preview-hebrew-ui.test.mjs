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

test('ATS pilot is explicitly blocked outside preview deployments',()=>{
 assert.match(source,/if \(process\.env\.VERCEL_ENV !== "preview"\) notFound\(\)/);
 const diagnostics=readFileSync(new URL('../app/ats-preview/source-check/route.ts',import.meta.url),'utf8');
 assert.match(diagnostics,/if \(process\.env\.VERCEL_ENV !== "preview"\) notFound\(\)/);
});
test('ATS pilot only fetches fixed employer boards and warns about partial coverage',()=>{
 assert.match(source,/const boards: readonly PublicBoard\[\] = \[/);
 assert.match(source,/availableSources < boards\.length/);
 assert.match(source,/מקורות לא הגיבו/);
 assert.match(source,/המקורות טרם אושרו לשימוש ציבורי/);
 assert.match(source,/rel="noopener noreferrer"/);
});

test('source diagnostics check exactly the same employer boards as the preview search',()=>{
 const diagnostics=readFileSync(new URL('../app/ats-preview/source-check/route.ts',import.meta.url),'utf8');
 const pattern=/\{ provider: "(greenhouse|lever)", token: "([^"]+)", company: "([^"]+)" \}/g;
 const extract=(text)=>[...text.matchAll(pattern)].map(match=>match[0]).sort();
 assert.equal(extract(source).length,5);
 assert.deepEqual(extract(diagnostics),extract(source));
});

test('preview source diagnostics fetch independent employer boards concurrently',()=>{
 const diagnostics=readFileSync(new URL('../app/ats-preview/source-check/route.ts',import.meta.url),'utf8');
 assert.match(diagnostics,/await Promise\.all\(boards\.map\(async board => \{/);
 assert.match(diagnostics,/timeoutMs: 2500/);
});
