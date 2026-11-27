// Input must be trusted, server-verified events. No email addresses or user IDs in output.
export type RadarEvent = { digestId: string; event: "sent" | "failed" | "clicked" | "returned" | "saved" | "applied"; at: string };
export function radarDailyReport(events: readonly RadarEvent[], day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10)!==day) throw new Error("Invalid UTC day");
  const start = Date.parse(day), end = start + 86400000;
  const cohort = new Map<string, number>();
  const failures = new Set<string>();
  for (const e of events) {
    const at = Date.parse(e.at);
    if (!e.digestId || !Number.isFinite(at) || at < start || at >= end) continue;
    if (e.event === "sent") cohort.set(e.digestId, Math.min(cohort.get(e.digestId) ?? at, at));
    if (e.event === "failed") failures.add(e.digestId);
  }
  const stages = {clicked: new Set<string>(), returned: new Set<string>(), saved: new Set<string>(), applied: new Set<string>()};
  for (const e of events) {
    const sent = cohort.get(e.digestId), at = Date.parse(e.at);
    if (sent === undefined || !Number.isFinite(at) || at < sent || at >= end) continue;
    if (e.event === "clicked" || e.event === "returned" || e.event === "saved" || e.event === "applied") stages[e.event].add(e.digestId);
  }
  const sent = cohort.size;
  const count = (s: Set<string>) => s.size;
  return {day, sent, failed: [...failures].filter(id => !cohort.has(id)).length, clicked: count(stages.clicked), returned: count(stages.returned), saved: count(stages.saved), applied: count(stages.applied), clickRate: sent ? count(stages.clicked)/sent : null};
}
