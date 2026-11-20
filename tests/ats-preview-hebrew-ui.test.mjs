import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../app/ats-preview/page.tsx',import.meta.url),'utf8');
test('preview form has exactly one search submit and three Hebrew inputs',()=>{
 for(const label of ['איזו משרה מחפשים?','מדינה','עיר', '(לא חובה)','חיפוש משרות']) assert.ok(source.includes(label),label);
 assert.equal((source.match(/type="submit"/g)||[]).length,1);
 for(const field of ['q','country','city']) assert.ok(source.includes('name="'+field+'"'),field);
 assert.ok(source.includes('dir="rtl"'));
});
test('preview does not fetch or display general jobs before search',()=>{
 assert.ok(source.includes('const hasSearch = Boolean(q || country || city || location)'));
 assert.ok(source.includes('hasSearch ? await Promise.all'));
 assert.ok(source.includes('hasSearch ? ('));
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
 assert.match(source,/מקורות המשרות טרם אושרו לשימוש ציבורי/);
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

test('redesigned search has accessible labels, responsive result cards and clear pilot disclaimer',()=>{
 assert.match(source,/aria-label="חיפוש משרות"/);
 assert.match(source,/aria-label="תוצאות החיפוש"/);
 assert.match(source,/md:grid-cols-2/);
 assert.match(source,/focus-visible:outline/);
 assert.match(source,/כיסוי המעסיקים חלקי/);
 assert.match(source,/ללא הרשמה כדי לחפש/);
});

test('mobile preview uses isolated light colors and honest zero-result fallback',()=>{
 const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
 assert.match(source,/className="ats-pilot-light/);
 assert.match(css,/\.ats-pilot-light \{ color-scheme: light/);
 assert.match(source,/countryWideJobs\.length > 0/);
 assert.match(source,/broaderRoleJobs\.length > 0/);
 assert.match(source,/לא בכל שוק העבודה/);
});

test('preview preserves original discovery routes without counting them as verified jobs',()=>{
 assert.match(source,/jobSearchSources\(/);
 assert.match(source,/searchRoutes\.map\(/);
 assert.match(source,/קישורי חיפוש, לא משרות שנמצאו או אומתו/);
 assert.match(source,/roleAlternatives\.join/);
});
