import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCvJobFit } from '../lib/cv-job-fit.ts';

const cv = 'Led a design system used by six product teams.\nRan user research and usability testing across three markets.\nHobbies: chess club on weekends.';
test('selects and reorders only the CV own lines, never rewrites or adds', () => {
  const fit = buildCvJobFit(['Design systems experience', 'Kubernetes operations'], cv, 'Product designer.');
  assert.equal(fit.matches.length, 1);
  assert.equal(fit.matches[0].line, 'Led a design system used by six product teams.');
  assert.deepEqual(fit.gaps, ['Kubernetes operations']);
  assert.ok(fit.keywordsMissing.some(k => k.startsWith('kubernet')));
  const lines = fit.reordered.split('\n').filter(l => l.startsWith('• ')).map(l => l.slice(2));
  for (const l of lines) assert.ok(cv.includes(l));
  assert.ok(fit.reordered.startsWith('Product designer.'));
  assert.ok(fit.reordered.indexOf('design system') < fit.reordered.indexOf('Ran user research'));
});
test('empty inputs produce no invented content', () => {
  const fit = buildCvJobFit([], '', '');
  assert.equal(fit.reordered, '');
  assert.equal(fit.matches.length, 0);
});
