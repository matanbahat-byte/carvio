type RequirementCategory = "Experience" | "Skills" | "Tools" | "Education" | "Other";

const requirementHeadings = /^(?:requirements?|qualifications?|what you(?:'|’)ll bring|what we(?:'|’)re looking for|skills?|experience|דרישות|כישורים|מה נדרש|ניסיון)\s*:?\s*$/i;
const nonRequirementHeadings = /^(?:responsibilities|about (?:the role|you|us)|benefits|what we offer|the opportunity|תחומי אחריות|על התפקיד|אודות|מה אנחנו מציעים)\s*:?\s*$/i;

export function splitRequirementText(value: string) {
  return value
    .replace(/\r/g, "")
    .split(/\n+|\s*[;；]\s*|(?<=[.!?])\s+(?=[A-Z\u0590-\u05FF])/u)
    .map((item) => item.replace(/^\s*(?:[-–—•*✓]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 3);
}

export function requirementCategory(requirement: string): RequirementCategory {
  if (/\b(?:degree|bachelor|master|phd|education|certification)\b|תואר|השכלה|הסמכה/i.test(requirement)) return "Education";
  if (/\b(?:years?|experience|background|led|managed|senior)\b|ניסיון|שנים|ניהול|הובלה/i.test(requirement)) return "Experience";
  if (/\b(?:figma|sql|excel|jira|salesforce|python|javascript|typescript|react|software|platform|tool)\b|תוכנה|מערכת|כלי/i.test(requirement)) return "Tools";
  if (/\b(?:skill|ability|communication|collaboration|analytical|strategic|fluent|language|proficien)\b|יכולת|כישורים|תקשורת|אנגלית|עברית/i.test(requirement)) return "Skills";
  return "Other";
}

export function uniqueRequirements(items: string[], limit = 12) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLocaleLowerCase().replace(/[.!?]+$/, "").trim();
    if (item.length < 8 || item.length > 320 || seen.has(key) || requirementHeadings.test(item) || nonRequirementHeadings.test(item)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export function extractJobRequirements(description: string) {
  if (!description.trim()) return [];
  const lines = description.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const candidates: string[] = [];
  let inRequirements = false;
  for (const line of lines) {
    const inlineHeading = line.match(/^(?:requirements?|qualifications?|skills?|experience|דרישות|כישורים|מה נדרש|ניסיון)\s*:\s*(.+)$/i);
    if (inlineHeading) {
      inRequirements = true;
      candidates.push(...splitRequirementText(inlineHeading[1]));
      continue;
    }
    const cleanLine = line.replace(/^\s*(?:[-–—•*✓]|\d+[.)])\s*/, "").trim();
    if (requirementHeadings.test(cleanLine)) { inRequirements = true; continue; }
    if (inRequirements && nonRequirementHeadings.test(cleanLine)) break;
    if (inRequirements) candidates.push(...splitRequirementText(cleanLine));
  }
  const signaled = lines.flatMap(splitRequirementText).filter((line) => /\b(?:years?|experience|required|must|proficien|ability|knowledge|degree|background)\b|ניסיון|חובה|יכולת|ידע|תואר/i.test(line));
  const fallback = splitRequirementText(description).filter((line) => line.length >= 28 && line.length <= 220);
  const responsibilities = lines.flatMap(splitRequirementText).filter((line) => /\b(?:manage|lead|own|develop|build|deliver|advanced|excel|sql|python)\b|ניהול|הובלה|אחריות|שליטה/i.test(line));
  return uniqueRequirements([...candidates, ...signaled, ...responsibilities, ...(!candidates.length && !signaled.length && !responsibilities.length ? fallback : [])]);
}
