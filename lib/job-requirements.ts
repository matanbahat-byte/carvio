type RequirementCategory = "Experience" | "Skills" | "Tools" | "Education" | "Other";

const requirementLabel = "required|requirements?|qualifications?|what you(?:'|’)ll bring|what we(?:'|’)re looking for|skills?|experience|דרישות(?: חובה)?|חובה|כישורים|מה נדרש|ניסיון";
const optionalLabel = "nice[- ]to[- ]haves?|preferred(?: qualifications?| skills?)?|optional|bonus|יתרון(?: משמעותי)?|רצוי|דרישות יתרון";
const requirementHeading = new RegExp(`^(?<label>${requirementLabel}|${optionalLabel})(?:\\s*:\\s*(?<body>.*))?$`, "i");
const optionalHeading = new RegExp(`^(?:${optionalLabel})$`, "i");
const standaloneSkill = /^(?:[A-Z][A-Z0-9+#.]{0,9}|sql|aws|python|excel|figma|jira|salesforce|javascript|typescript|react|אקסל|פייתון)[.!]?$/u;
const requirementSignal = /\b(?:years?|experience|required|must|proficien\w*|ability|knowledge|degree|background)\b|ניסיון|חובה|יכולת|ידע|תואר/i;
const roleSignal = /\b(?:manage|lead|own|develop|build|deliver|advanced|excel|sql|python)\b|ניהול|הובלה|אחריות|שליטה/i;
const nonRequirementHeadings = /^(?:responsibilities|about (?:the role|you|us)|benefits|what we offer|the opportunity|תחומי אחריות|על התפקיד|אודות|מה אנחנו מציעים)\s*:?\s*$/i;

export function splitRequirementText(value: string) {
  return value
    .replace(/\r/g, "")
    .split(/\n+|\s*[;；]\s*|(?<=[.!?])\s+(?=[A-Z\u0590-\u05FF])/u)
    .map((item) => item.replace(/^\s*(?:[-–—•*✓]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function requirementCategory(requirement: string): RequirementCategory {
  if (/\b(?:degree|bachelor|master|phd|education|certification)\b|תואר|השכלה|הסמכה/i.test(requirement)) return "Education";
  if (/\b(?:years?|experience|background|led|managed|senior)\b|ניסיון|שנים|ניהול|הובלה/i.test(requirement)) return "Experience";
  if (/\b(?:figma|sql|aws|excel|jira|salesforce|python|javascript|typescript|react|software|platform|tool)\b|תוכנה|מערכת|כלי/i.test(requirement)) return "Tools";
  if (/\b(?:skill|ability|communication|collaboration|analytical|strategic|fluent|language|proficien)\b|יכולת|כישורים|תקשורת|אנגלית|עברית/i.test(requirement)) return "Skills";
  return "Other";
}

export function uniqueRequirements(items: string[], limit = 12) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLocaleLowerCase().replace(/[.!?]+$/, "").trim();
    const heading = requirementHeading.exec(item)?.groups;
    if (!key || item.length > 320 || seen.has(key) || (heading && !heading.body) || nonRequirementHeadings.test(item)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function splitSkillList(fragment: string) {
  const parts = fragment.split(/[,，]\s*/u).map((item) => item.trim());
  const skills = parts.map((item) => item.replace(/^(?:and |ו(?=[A-Za-z]))/iu, ""));
  return skills.length > 1 && skills.every((item) => standaloneSkill.test(item) || requirementSignal.test(item))
    ? skills
    : [fragment];
}

export function extractJobRequirements(description: string) {
  const candidates: string[] = [];
  const other: string[] = [];
  let section: "required" | "optional" | "other" | null = null;
  let preferredLabel = "";
  for (const fragment of splitRequirementText(description)) {
    const heading = requirementHeading.exec(fragment)?.groups;
    if (heading) {
      section = optionalHeading.test(heading.label) ? "optional" : "required";
      preferredLabel = heading.label;
    } else if (nonRequirementHeadings.test(fragment)) {
      section = "other";
      continue;
    }
    const body = heading ? heading.body : fragment;
    if (!body) continue;
    for (const item of splitSkillList(body)) {
      if (section === "optional") candidates.push(`${preferredLabel}: ${item}`);
      else if (section === "required" || standaloneSkill.test(item)) candidates.push(item);
      else other.push(item);
    }
  }
  const signaled = other.filter((item) => requirementSignal.test(item) || roleSignal.test(item));
  return uniqueRequirements([...candidates, ...signaled, ...(!candidates.length && !signaled.length ? other.filter((item) => item.length >= 28 && item.length <= 220) : [])]);
}
