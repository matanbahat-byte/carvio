import { evidenceForRequirements, type LinkedEvidence } from "./evidence-links.ts";

type PreparationSource = {
  id: string;
  requirementEvidence: { id?: string; requirement: string; evidence: string }[];
  evidenceItems?: LinkedEvidence[];
};

export function interviewSuggestions(application: PreparationSource, language: "he" | "en") {
  return evidenceForRequirements(application.requirementEvidence, application.evidenceItems || [], application.id)
    .filter(row => row.requirement.trim())
    .map(row => {
      const hasExample = Boolean(row.evidence.trim());
      const question = language === "he"
        ? `שאלת תרגול מוצעת: איזו דוגמה מהניסיון שלכם רלוונטית לדרישה ״${row.requirement}״? מה היה המצב, מה עשיתם ומה הייתה התוצאה?`
        : `Suggested practice question: Which example from your experience relates to “${row.requirement}”? What was the situation, what did you do, and what was the outcome?`;
      const context = hasExample
        ? (language === "he" ? `דוגמה שמורה לבדיקת רלוונטיות ולעריכה:\n${row.evidence}` : `Saved example to review for relevance and edit:\n${row.evidence}`)
        : (language === "he" ? "טרם נשמרה דוגמה מקושרת לדרישה זו. אם יש ניסיון רלוונטי, הוסיפו דוגמה אמיתית; אחרת הכינו שאלה לבירור הציפיות." : "No linked example is saved for this requirement yet. If you have relevant experience, add a real example; otherwise prepare a question to clarify expectations.");
      return { requirement: row.requirement, question, context, field: hasExample ? "starStories" as const : "gapsToExplain" as const, text: `${question}\n${context}` };
    });
}

// Explicit additions preserve manual text, including a deliberately empty draft.
export function appendInterviewSuggestion(current: string, suggestion: string) {
  if (current.includes(suggestion)) return current;
  return current ? `${current}\n\n${suggestion}` : suggestion;
}

export function initialInterviewPreparation<T extends { starStories: string; interviewerQuestions: string; gapsToExplain: string; updatedAt: string }>(application: PreparationSource, saved: T, language: "he" | "en"): T {
  // A saved draft may deliberately contain blank fields. Never regenerate it on reopen.
  if (saved.updatedAt) return { ...saved };
  const suggestions = interviewSuggestions(application, language);
  return {
    ...saved,
    interviewerQuestions: saved.interviewerQuestions || suggestions.map(item => item.question).join("\n\n"),
    starStories: saved.starStories || suggestions.filter(item => item.field === "starStories").map(item => item.text).join("\n\n"),
    gapsToExplain: saved.gapsToExplain || suggestions.filter(item => item.field === "gapsToExplain").map(item => item.text).join("\n\n"),
  };
}
