import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaEntries, scheduledTimestamp } from '../lib/schedule.ts';

test('a meeting never hides a separate action deadline', () => {
  const result = agendaEntries([{id:'qa', eventDateTime:'2026-11-05T11:00', eventType:'Interview', nextStepDue:'2026-11-03T10:30'}]);
  assert.equal(result.length,2);
  assert.equal(result[0].agendaKey,'qa-action');
  assert.equal(result[1].agendaKey,'qa-meeting');
  assert.equal(result[0].id,'qa');
});
test('invalid and empty dates do not create calendar rows', () => {
  assert.deepEqual(agendaEntries([{id:'qa',eventDateTime:'invalid',eventType:'',nextStepDue:''}]),[]);
});
test('date-only deadlines retain local calendar date and last until end of day', () => {
  const previous=process.env.TZ;
  try {
    for(const timezone of ['Asia/Jerusalem','America/Los_Angeles','Pacific/Auckland']) {
      process.env.TZ=timezone;
      const midday=new Date(scheduledTimestamp('2026-11-03'));
      const deadline=new Date(scheduledTimestamp('2026-11-03',true));
      assert.equal(midday.getDate(),3);
      assert.equal(midday.getHours(),12);
      assert.equal(deadline.getHours(),23);
      assert.ok(deadline.getTime()>midday.getTime());
    }
  } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
