export type LinkedEvidence = { id: string; applicationId: string; text: string; requirementIds: string[] };

export function firstApplicationEvidence(application: { id: string; requirementEvidence: { id?: string; evidence: string }[]; evidenceItems?: LinkedEvidence[] } | null | undefined) {
  if (!application) return "";
  return evidenceForRequirements(application.requirementEvidence, application.evidenceItems || [], application.id).find(item => item.evidence.trim())?.evidence.trim() || "";
}

export function restorableRequirementEvidence<T extends { id?: string; requirement: string; evidence: string }>(rows: T[]): T[] {
  return rows.filter(item => Boolean(item && typeof item.requirement === "string" && typeof item.evidence === "string"));
}

export function evidenceContext(requirements: { id?: string; requirement: string; evidence: string }[], items: LinkedEvidence[], applicationId: string, language: "he" | "en") {
  const mapped = evidenceForRequirements(requirements, items, applicationId);
  if (!mapped.length) return language === "he" ? "טרם נשמרו דרישות למשרה." : "No role requirements have been saved yet.";
  return mapped.map((item, index) => {
    const evidence = item.evidence.trim() || (language === "he" ? "פער: נדרשת דוגמה או דרך להסביר את הפער." : "Gap: add a proof point or prepare how to explain the gap.");
    return `${index + 1}. ${item.requirement}\n   ${language === "he" ? "ראיה" : "Evidence"}: ${evidence}`;
  }).join("\n");
}

export function evidenceForRequirements<T extends { id?: string; evidence: string }>(requirements: T[], items: LinkedEvidence[], applicationId: string): T[] {
  return requirements.map(requirement => {
    let evidence = requirement.evidence;
    for (const item of items) {
      if (requirement.id && item.applicationId === applicationId && item.requirementIds.includes(requirement.id) && item.text.trim() && !evidence.includes(item.text)) evidence = [evidence, item.text].filter(Boolean).join("\n");
    }
    return { ...requirement, evidence };
  });
}

// Links are explicit references, never copies or inferred matches. Legacy notes remain untouched.
export function relinkEvidence<T extends LinkedEvidence>(items: T[], applicationId: string, evidenceId: string, selectedIds: string[], requirements: { id?: string; ignored?: boolean }[]): T[] {
  const allowed = new Set(requirements.filter(item => item.id && !item.ignored).map(item => item.id));
  const requirementIds = [...new Set(selectedIds)].filter(id => allowed.has(id));
  return items.map(item => item.id === evidenceId && item.applicationId === applicationId ? { ...item, requirementIds } : item);
}
