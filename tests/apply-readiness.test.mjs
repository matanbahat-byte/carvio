import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReadiness} from '../lib/apply-readiness.ts';

const base = {
  jobUrl: 'https://example.com/job/1',
  jobDescription: 'A sufficiently detailed role description that explains the work, team, ownership, and expected outcomes.',
  requirementEvidence: [
    {requirement: 'Lead product discovery', evidence: 'Led discovery across three product teams.'},
    {requirement: 'Work with engineering', evidence: 'Partnered with engineering on quarterly delivery.'},
    {requirement: 'Communicate with executives', evidence: ''},
  ],
  contactName: 'Dana',
};

test('ready requires source, useful description, organized requirements and real evidence', () => {
  const result = applyReadiness(base, 'en');
  assert.equal(result.state, 'ready');
  assert.equal(result.effort, 'low');
  assert.equal(result.missingTarget, null);
  assert.match(result.signals[0].detail, /2 requirements/);
});

test('missing context recommends research without inventing a fit score', () => {
  const result = applyReadiness({jobUrl: '', jobDescription: '', requirements: 'Communication'}, 'en');
  assert.equal(result.state, 'research');
  assert.equal(result.effort, 'high');
  assert.equal(result.missingTarget, 'job-url');
  assert.equal(JSON.stringify(result).includes('%'), false);
});

test('Hebrew output identifies a concrete uncovered requirement', () => {
  const result = applyReadiness(base, 'he');
  assert.equal(result.signals.find((item) => item.key === 'gap')?.detail, 'Communicate with executives');
  assert.match(result.signals.find((item) => item.key === 'effort')?.detail || '', /נמוך/);
});
