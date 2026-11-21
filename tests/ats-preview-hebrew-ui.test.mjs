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
 assert.match(source,/prioritizedRoutes\.map\(/);
 assert.match(source,/קישורי חיפוש, לא משרות שנמצאו או אומתו/);
 assert.match(source,/roleAlternatives\.join/);
});

test('original multi-platform discovery is visible before limited ATS results',()=>{
 assert.ok(source.includes('LinkedIn הוא נקודת הפתיחה הראשית לחיפוש. אחריו Indeed ו־Google'));
 assert.ok(source.indexOf('prioritizedRoutes.map') < source.indexOf('aria-label="תוצאות החיפוש"'));
 assert.ok(source.includes('מקורות מעסיקים זמינים (מתוך '));
 assert.ok(source.includes('availableSources ? jobs.length'));
 assert.ok(source.includes('boards.length'));
 assert.ok(source.includes('חמשת מקורות המעסיקים לא זמינים כרגע'));
 assert.ok(!source.includes('משרות בחמשת אתרי המעסיקים'));
});

test('broad fallback does not silently apply date or employment restrictions',()=>{
 assert.match(source,/const broadRoutes = q \? jobSearchSources\(/);
 assert.match(source,/datePosted: "Any time", employmentType: ""/);
 assert.match(source,/broadRoutes\.map\(/);
 assert.match(source,/שם התפקיד המדויק בלבד/);
});

test('primary external search is not silently limited to past month or full time',()=>{
 assert.match(source,/alternativeRoles: roleAlternatives\.join\(", "\), radius: "", country: searchCountry, location: externalLocation, datePosted: "Any time", employmentType: ""/);
 assert.doesNotMatch(source,/datePosted: "Past month"/);
});

test('LinkedIn is first and visually primary, with Indeed then Google and company ATS jobs after',()=>{
 assert.match(source,/const prioritizedRoutes = \[\.\.\.searchRoutes\]\.sort/);
 assert.match(source,/linkedin: 0, indeed: 1, google: 2/);
 assert.match(source,/route\.id === "linkedin" \? "LinkedIn · חיפוש ראשי"/);
 assert.match(source,/route\.id === "linkedin" \? "flex min-h-\[76px\]/);
 assert.ok(source.indexOf('prioritizedRoutes.map') < source.indexOf('aria-label="תוצאות החיפוש"'));
 assert.match(source,/קישורי חיפוש, לא משרות שנמצאו או אומתו/);
});

test('simple search does not silently impose a 25-km radius on LinkedIn or Indeed',()=>{
 assert.match(source,/alternativeRoles: roleAlternatives\.join\(", "\), radius: "", country: searchCountry/);
 assert.match(source,/role: q, radius: "", country: searchCountry/);
});

test('Hebrew city inputs are translated for external provider search URLs',()=>{
 assert.match(source,/"תל אביב": "Tel Aviv"/);
 assert.match(source,/"חיפה": "Haifa"/);
 assert.match(source,/const externalLocation = externalCityNames/);
 assert.equal((source.match(/location: externalLocation, datePosted:/g)||[]).length,2);
});
