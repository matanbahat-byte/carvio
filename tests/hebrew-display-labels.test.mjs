import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedSearchFilter,emptySearchProfile,jobSearchSources} from '../lib/job-search.ts';
test('Hebrew display labels preserve canonical English values and unknown sources',()=>{
 const labels={Medium:'בינונית','Company careers':'אתר החברה','Company careers page':'אתר החברה',Netherlands:'הולנד',Israel:'ישראל','United Kingdom':'בריטניה',Germany:'גרמניה',France:'צרפת',Spain:'ספרד',Portugal:'פורטוגל',Belgium:'בלגיה','United States':'ארצות הברית',Canada:'קנדה',Other:'אחר'};
 for(const [value,label] of Object.entries(labels)){assert.equal(localizedSearchFilter(value,'he'),label);assert.equal(localizedSearchFilter(value,'en'),value);}
 assert.equal(localizedSearchFilter('Custom source','he'),'Custom source');assert.equal(localizedSearchFilter('LinkedIn','he'),'LinkedIn');
});
test('translated country presentation does not affect generated search URLs or profiles',()=>{
 const profile={...emptySearchProfile,role:'Software Engineer',country:'Israel',location:'Tel Aviv'};
 const before=structuredClone(profile),he=jobSearchSources(profile,'he'),en=jobSearchSources(profile,'en');
 for(const id of ['linkedin','indeed'])assert.equal(he.find(s=>s.id===id).url,en.find(s=>s.id===id).url);
 assert.ok(he[0].applied.some(label=>label.includes('Tel Aviv, ישראל')));assert.deepEqual(profile,before);
});
