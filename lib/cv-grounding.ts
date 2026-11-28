// Keyword-overlap lookup of saved CV lines for a job requirement.
// This is a retrieval aid only: a match shows where the CV mentions similar words, not that the requirement is met.
const STOP = new Set(["the","and","for","with","you","your","our","are","will","have","has","experience","years","year","ability","strong","work","working","team","skills","skill","knowledge","of","in","to","a","an","or","on","as","at","by","be","is","בעל","בעלת","ניסיון","שנות","יכולת","עבודה","עם","של","על","או","את","כולל","ידע","כישורים"]);
const tokens = (text: string) => (text.toLowerCase().match(/[\p{L}\p{N}+#.]{3,}/gu) || []).map(t => t.replace(/^[.]+|[.]+$/g, "")).filter(t => t.length >= 3 && !STOP.has(t));
export type CvLineMatch = { requirement: string; line: string; shared: string[] };

export function cvLines(cvText: string) {
  return cvText.split(/\r?\n|(?<=[.!?])\s+/).map(line => line.replace(/^[\s•\-–*·]+/, "").trim()).filter(line => line.length >= 25 && line.length <= 280);
}

export function matchCvLines(requirements: string[], cvText: string, perRequirement = 1): CvLineMatch[] {
  const lines = cvLines(cvText || "");
  if (!lines.length) return [];
  const lineTokens = lines.map(line => new Set(tokens(line)));
  const out: CvLineMatch[] = [];
  for (const requirement of requirements) {
    const need = Array.from(new Set(tokens(requirement)));
    if (!need.length) continue;
    const scored = lines.map((line, i) => ({ line, shared: need.filter(t => lineTokens[i].has(t)) })).filter(x => x.shared.length >= Math.min(2, need.length)).sort((a, b) => b.shared.length - a.shared.length);
    for (const hit of scored.slice(0, perRequirement)) out.push({ requirement, line: hit.line, shared: hit.shared });
  }
  return out;
}
