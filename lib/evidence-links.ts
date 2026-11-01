export type LinkedEvidence = { id: string; applicationId: string; text: string; requirementIds: string[] };

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
