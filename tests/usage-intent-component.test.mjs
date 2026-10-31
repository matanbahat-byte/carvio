import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {UsageIntentPicker} from '../components/usage-intent-picker.ts';
test('goal picker renders every canonical variant, including skipped empty use',()=>{
 for(const intent of ['active_search','better_role','market_exploration','networking_focus','unspecified']) for(const language of ['he','en']) {
   const html=renderToStaticMarkup(createElement(UsageIntentPicker,{intent,language,onChange:()=>{}}));
   assert.ok(html.includes(`value="${intent}" selected=""`)); assert.equal((html.match(/<option/g)||[]).length,5); assert.ok(html.includes('<label')); assert.ok(html.includes('optional')||html.includes('אופציונלי'));
 }
});
