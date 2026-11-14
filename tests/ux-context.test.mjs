import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDayOffset, greetingForHour, meaningfulMomentum } from '../lib/ux-context.ts';

const now = Date.parse('2026-11-14T12:00:00Z');

test('completed application actions count as meaningful momentum', () => {
  const result = meaningfulMomentum(
    [{ id: 'a1', status: 'Considering', appliedDate: '' }],
    [],
    [{ id: 'e1', name: 'application_action_completed', targetId: 'a1', occurredAt: '2026-11-14T11:00:00Z' }],
    now,
  );
  assert.equal(result.total, 1);
});

test('planned future work is not counted and old events expire', () => {
  const result = meaningfulMomentum(
    [{ id: 'a1', status: 'Considering', appliedDate: '2026-11-14' }],
    [],
    [{ id: 'e1', name: 'application_action_completed', targetId: 'a1', occurredAt: '2026-11-01T11:00:00Z' }],
    now,
  );
  assert.equal(result.total, 0);
});

test('the same entity is not double-counted in the seven day window', () => {
  const result = meaningfulMomentum(
    [{ id: 'a1', status: 'Applied', appliedDate: '2026-11-14' }],
    [],
    [{ id: 'e1', name: 'application_action_completed', targetId: 'a1', occurredAt: '2026-11-14T11:00:00Z' }],
    now,
  );
  assert.equal(result.total, 1);
});

test('greetings follow the browser local hour', () => {
  assert.equal(greetingForHour('he', 8), 'בוקר טוב');
  assert.equal(greetingForHour('he', 14), 'צהריים טובים');
  assert.equal(greetingForHour('en', 19), 'Good evening');
  assert.equal(greetingForHour('en', 23), 'Good night');
});

test('calendar day offsets use local calendar dates rather than elapsed hours', () => {
  const early = new Date(2026, 10, 14, 0, 1).getTime();
  const late = new Date(2026, 10, 14, 23, 59).getTime();
  assert.equal(calendarDayOffset('2026-11-14T23:59:00', early), 0);
  assert.equal(calendarDayOffset('2026-11-15T00:01:00', late), 1);
  assert.equal(calendarDayOffset('2026-11-15', late), 1);
});
