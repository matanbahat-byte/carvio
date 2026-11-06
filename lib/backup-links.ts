const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.every(id => typeof id === "string" && id.trim().length > 0);

export function validApplicationLinks(value: unknown): boolean {
  if (!record(value)) return false;
  if (value.linkedContactIds !== undefined && !ids(value.linkedContactIds)) return false;
  if (value.linkedResumeId !== undefined && typeof value.linkedResumeId !== "string") return false;
  if (value.requirementEvidence !== undefined && (!Array.isArray(value.requirementEvidence) || !value.requirementEvidence.every(row => record(row) && typeof row.requirement === "string" && typeof row.evidence === "string" && (row.id === undefined || (typeof row.id === "string" && row.id.trim().length > 0))))) return false;
  if (value.evidenceItems === undefined) return true; // Older backups have no structured evidence.
  if (!Array.isArray(value.evidenceItems)) return false;
  const seen = new Set<string>();
  return value.evidenceItems.every(item => {
    if (!record(item) || typeof item.id !== "string" || !item.id.trim() || seen.has(item.id) || typeof value.id !== "string" || !value.id.trim() || item.applicationId !== value.id || typeof item.text !== "string" || !ids(item.requirementIds)) return false;
    seen.add(item.id);
    return true;
  });
}
