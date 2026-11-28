import { cvLines, matchCvLines, tokens } from "./cv-grounding.ts";

// Rules-based fit view of a saved CV against one job. It only selects and reorders the user's own CV text:
// nothing is reworded, added or scored as quality. A match is a word overlap, not proof the requirement is met.
export type CvJobFit = {
  matches: { requirement: string; line: string; shared: string[] }[];
  gaps: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
  reordered: string;
};

export function buildCvJobFit(requirements: string[], cvText: string, summary = ""): CvJobFit {
  const reqs = requirements.map(r => r.trim()).filter(Boolean).slice(0, 8);
  const matches = matchCvLines(reqs, cvText);
  const gaps = reqs.filter(r => !matches.some(m => m.requirement === r));
  const cvTokens = new Set(tokens(cvText));
  const jobTokens = Array.from(new Set(reqs.flatMap(r => tokens(r))));
  const keywordsFound = jobTokens.filter(t => cvTokens.has(t)).slice(0, 12);
  const keywordsMissing = jobTokens.filter(t => !cvTokens.has(t)).slice(0, 12);
  const matchedLines = Array.from(new Set(matches.map(m => m.line)));
  const rest = cvLines(cvText).filter(l => !matchedLines.includes(l));
  const reordered = [summary.trim(), matchedLines.length ? matchedLines.map(l => "• " + l).join("\n") : "", rest.length ? rest.map(l => "• " + l).join("\n") : ""].filter(Boolean).join("\n\n");
  return { matches, gaps, keywordsFound, keywordsMissing, reordered };
}
