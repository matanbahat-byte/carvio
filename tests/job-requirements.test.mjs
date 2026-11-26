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

test('retains all four units in the reported case and labels AWS as optional', () => {
  const source = 'Required: Python; SQL; 3 years of experience. Nice to have: AWS.';
  assert.deepEqual(extractJobRequirements(source), ['Python', 'SQL', '3 years of experience.', 'Nice to have: AWS.']);
});

test('recognizes standalone skills across separators and languages', () => {
  for (const source of ['SQL', 'AWS', 'SQL, AWS', 'SQL; AWS', 'SQL\nAWS', 'דרישות: SQL, AWS', 'דרישות:\nSQL; AWS']) {
    assert.deepEqual(extractJobRequirements(source), source === 'SQL' || source === 'AWS' ? [source] : ['SQL', 'AWS'], source);
  }
  assert.deepEqual(extractJobRequirements('יתרון:\nSQL, AWS'), ['יתרון: SQL', 'יתרון: AWS']);
  assert.deepEqual(extractJobRequirements('Required: C++; R\nPreferred:\nAWS\nSQL'), ['C++', 'R', 'Preferred: AWS', 'Preferred: SQL']);
});

test('encoded ATS HTML preserves requirement sections and excludes code and marketing',()=>{
 const source='&lt;h2&gt;About us&lt;/h2&gt;&lt;p&gt;Build the best customer experience in the world.&lt;/p&gt;&lt;h2&gt;Requirements&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;3 years of experience&lt;/li&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;/ul&gt;&lt;script&gt;const experience = "fake";&lt;/script&gt;&lt;h2&gt;Benefits&lt;/h2&gt;&lt;p&gt;Experience our advanced benefits platform.&lt;/p&gt;';
 assert.deepEqual(extractJobRequirements(source),['3 years of experience','SQL']);
});
test('marketing-only prose and code do not produce guessed requirements',()=>{
 for(const source of ['We are excited to welcome you to our growing global family.','<script>const required = "SQL";</script>','<style>.experience { color: red; }</style>','About us\nWe build advanced software and deliver a great experience.'])assert.deepEqual(extractJobRequirements(source),[]);
});
test('Hebrew HTML requirements and preferred skills remain distinguishable',()=>{
 assert.deepEqual(extractJobRequirements('<h2>דרישות</h2><ul><li>ניסיון בניהול מלאי</li><li>אנגלית חובה</li></ul><h2>יתרון</h2><p>SQL</p>'),['ניסיון בניהול מלאי','אנגלית חובה','יתרון: SQL']);
});
test('source qualification headings stop before compensation and additional marketing',()=>{
 const text='About us\nBuild a leading platform.\nMinimum qualifications\nStrong SQL skills\nPreferred qualifications\nCPA certification\nThe annual compensation range for this role is listed below.\nFor sales roles, the range includes commission.\nAnnual Salary:\n$100000\nAdditional information\nExperience our amazing benefits.';
 assert.deepEqual(extractJobRequirements(text),['Strong SQL skills','Preferred qualifications: CPA certification']);
});
