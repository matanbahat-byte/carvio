export function messageFollowUpTarget(context: { contactId?: string; applicationId?: string } | null, contactIds: string[], applicationIds: string[]) {
  if (context?.contactId && contactIds.includes(context.contactId)) return { kind: "contact" as const, id: context.contactId };
  if (context?.applicationId && applicationIds.includes(context.applicationId)) return { kind: "application" as const, id: context.applicationId };
  return null;
}

export function followUpDate(now: Date, days = 7) {
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}
