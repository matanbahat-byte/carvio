/** Date-only values are local calendar days, never UTC midnight. */
export function scheduledTimestamp(value: string, endOfDay = false) {
  if (!value) return Number.NaN;
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${endOfDay ? "23:59:59" : "12:00:00"}` : value);
}

export function agendaEntries<T extends { id: string; eventDateTime: string; nextStepDue: string; eventType: string }>(items: T[]) {
  return items.flatMap((item) => [
    ...(Number.isFinite(scheduledTimestamp(item.eventDateTime)) ? [{ ...item, agendaKey: `${item.id}-meeting` }] : []),
    ...(Number.isFinite(scheduledTimestamp(item.nextStepDue)) ? [{ ...item, eventDateTime: "", eventType: "", agendaKey: `${item.id}-action` }] : []),
  ]).sort((a, b) => scheduledTimestamp(a.eventDateTime || a.nextStepDue) - scheduledTimestamp(b.eventDateTime || b.nextStepDue));
}
