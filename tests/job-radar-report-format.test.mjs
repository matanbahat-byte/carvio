import test from 'node:test';import assert from 'node:assert/strict';import {radarReportMarkdown} from '../lib/job-radar-report-format.ts';import {radarDailyReport} from '../lib/job-radar-report.ts';
test('readable empty daily report does not invent zero conversion rates, people or employer confirmations',()=>{
 const text=radarReportMarkdown(radarDailyReport([],'2026-11-27',{asOf:new Date('2026-11-28')}));assert.match(text,/לא זמין/);assert.doesNotMatch(text,/0\.0%/);assert.match(text,/אישור ממעסיק/);assert.match(text,/ייחודית לכל התראה/);
});
