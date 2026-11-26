export const CV_DRAFT_KEY = "carvio.cv-draft.v1";
export type CvDraft = { version: 1; current: string; previous: string | null };
export const emptyCvDraft: CvDraft = { version: 1, current: "", previous: null };

export function readCvDraft(storage: Pick<Storage, "getItem">): CvDraft {
  const raw = storage.getItem(CV_DRAFT_KEY);
  if (raw === null) return { ...emptyCvDraft };
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || typeof value.current !== "string"
    || !(value.previous === null || typeof value.previous === "string")) throw new Error("Unreadable CV draft");
  return { version: 1, current: value.current, previous: value.previous };
}

export function replaceCvDraft(saved: CvDraft, current: string): CvDraft {
  // Regenerating identical text must not overwrite the recoverable copy.
  if (saved.current === current) return saved;
  return { version: 1, current, previous: saved.current.length ? saved.current : saved.previous };
}

export function writeCvDraft(storage: Pick<Storage, "setItem">, draft: CvDraft) {
  // One write: a failed backup cannot leave a newly replaced current draft.
  storage.setItem(CV_DRAFT_KEY, JSON.stringify(draft));
}
