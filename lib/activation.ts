export function nextActionDueTomorrow(now = new Date()) {
  const due = new Date(now);
  due.setDate(due.getDate() + 1);
  due.setHours(10, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T${pad(due.getHours())}:${pad(due.getMinutes())}`;
}

export function firstJobDecisionComplete(input: { role: string; company: string; nextStep: string; nextStepDue: string }) {
  return Boolean(input.role.trim() && input.company.trim() && input.nextStep.trim() && input.nextStepDue.trim());
}
