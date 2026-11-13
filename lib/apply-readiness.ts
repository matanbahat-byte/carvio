export type ApplyReadinessTarget = "job-url" | "job-description" | "requirements" | "evidence" | "contact";

type RequirementEvidence = { requirement?: string; evidence?: string };

type ApplyReadinessInput = {
  jobUrl?: string;
  jobDescription?: string;
  requirements?: string;
  requirementEvidence?: RequirementEvidence[];
  evidenceItems?: { text?: string; requirementIds?: string[] }[];
  contactName?: string;
  linkedContactIds?: string[];
};

export type ApplyReadinessResult = {
  state: "ready" | "research";
  effort: "low" | "medium" | "high";
  missingTarget: ApplyReadinessTarget | null;
  signals: {
    key: "evidence" | "gap" | "contact" | "effort";
    tone: "positive" | "attention" | "neutral";
    title: string;
    detail: string;
  }[];
};

function requirementLines(value = "") {
  return value.split(/\n|;|•/).map((item) => item.trim()).filter(Boolean);
}

export function applyReadiness(input: ApplyReadinessInput, language: "en" | "he"): ApplyReadinessResult {
  const requirements = input.requirementEvidence?.filter((item) => item.requirement?.trim()) || [];
  const requirementCount = requirements.length || requirementLines(input.requirements).length;
  const directEvidenceCount = requirements.filter((item) => (item.evidence || "").trim().length >= 12).length;
  const linkedEvidenceCount = (input.evidenceItems || []).filter((item) => (item.text || "").trim().length >= 12 && item.requirementIds?.length).length;
  const evidenceCount = Math.max(directEvidenceCount, linkedEvidenceCount);
  const hasSource = Boolean(input.jobUrl?.trim());
  const hasDescription = (input.jobDescription || "").trim().length >= 80;
  const hasRequirements = requirementCount >= 3;
  const hasEvidence = requirementCount > 0 && evidenceCount >= Math.min(2, requirementCount);
  const hasContact = Boolean(input.contactName?.trim() || input.linkedContactIds?.length);
  const completed = [hasSource, hasDescription, hasRequirements, hasEvidence, hasContact].filter(Boolean).length;
  const effort = completed >= 4 ? "low" : completed >= 2 ? "medium" : "high";
  const missingTarget: ApplyReadinessTarget | null = !hasSource ? "job-url" : !hasDescription ? "job-description" : !hasRequirements ? "requirements" : !hasEvidence ? "evidence" : !hasContact ? "contact" : null;
  const firstGap = requirements.find((item) => !(item.evidence || "").trim())?.requirement?.trim();

  return {
    state: hasSource && hasDescription && hasRequirements && hasEvidence ? "ready" : "research",
    effort,
    missingTarget,
    signals: [
      {
        key: "evidence",
        tone: hasEvidence ? "positive" : "attention",
        title: language === "he" ? "ראיות להתאמה" : "Fit evidence",
        detail: evidenceCount
          ? (language === "he" ? `${evidenceCount} דרישות מגובות בדוגמה אמיתית.` : `${evidenceCount} requirements have a real proof point.`)
          : (language === "he" ? "עדיין לא נשמרה דוגמה שמוכיחה התאמה." : "No saved proof point demonstrates fit yet."),
      },
      {
        key: "gap",
        tone: firstGap || !hasRequirements ? "attention" : "positive",
        title: language === "he" ? "פער מרכזי לבדיקה" : "Key gap to check",
        detail: firstGap || (hasRequirements
          ? (language === "he" ? "לדרישות שנשמרו יש כיסוי ראשוני." : "Saved requirements have initial evidence coverage.")
          : (language === "he" ? "חסרות דרישות מסודרות מהמשרה." : "Organized job requirements are still missing.")),
      },
      {
        key: "contact",
        tone: hasContact ? "positive" : "neutral",
        title: language === "he" ? "קשר אפשרי בחברה" : "Possible company contact",
        detail: hasContact
          ? (language === "he" ? "יש איש קשר שמקושר להזדמנות." : "A contact is linked to this opportunity.")
          : (language === "he" ? "לא נמצא עדיין איש קשר מקושר." : "No linked company contact yet."),
      },
      {
        key: "effort",
        tone: effort === "low" ? "positive" : effort === "medium" ? "neutral" : "attention",
        title: language === "he" ? "מאמץ נדרש לפני הגשה" : "Preparation effort",
        detail: language === "he"
          ? ({ low: "נמוך — רוב המידע הדרוש כבר שמור.", medium: "בינוני — כדאי להשלים כמה פרטים ממוקדים.", high: "גבוה — חסר הקשר בסיסי להחלטה אחראית." } as const)[effort]
          : ({ low: "Low — most decision inputs are already saved.", medium: "Medium — complete a few focused details first.", high: "High — core decision context is still missing." } as const)[effort],
      },
    ],
  };
}
