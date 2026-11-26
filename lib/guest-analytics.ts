// Guest telemetry accepts only coarse, explicitly enumerated events.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const events = new Set(["guest_visit", "search_submitted", "search_opened_by_source", "return_visit"]);
const sources = new Set(["linkedin", "indeed", "google", "company", "company-careers"]);
export function validateGuestEvent(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  if (typeof row.id !== "string" || !uuid.test(row.id) || typeof row.eventName !== "string" || !events.has(row.eventName)) return null;
  const source = row.sourceType;
  if (row.eventName === "search_opened_by_source" && (typeof source !== "string" || !sources.has(source))) return null;
  return { id: row.id.toLowerCase(), eventName: row.eventName, ...(row.eventName === "search_opened_by_source" ? { sourceType: source as string } : {}) };
}
