import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJobRequirements } from '../lib/job-requirements.ts';

test('preserves responsibilities and tools beside a signaled requirement', () => {
  const source = 'TEST DATA ONLY. Manage inventory; lead a team of 8; advanced Excel; English required.';
  const result = extractJobRequirements(source);
  for (const expected of ['Manage inventory', 'lead a team of 8', 'advanced Excel', 'English required.']) assert.ok(result.includes(expected), expected);
  assert.ok(result.every(item => source.includes(item)));
});
test('handles Hebrew lines and semicolons without inventing content', () => {
  const source = 'דרישות:\nניסיון בניהול מלאי; שליטה באקסל; אנגלית חובה';
  assert.equal(extractJobRequirements(source).length, 3);
  assert.ok(extractJobRequirements(source).every(item => source.includes(item)));
});
test('empty text stays empty and repeated requirements are deduplicated', () => {
  assert.deepEqual(extractJobRequirements('  '), []);
  assert.equal(extractJobRequirements('Requirements:\nAdvanced Excel; Advanced Excel').length, 1);
});
