import { evidenceForRequirements, type LinkedEvidence } from "./evidence-links.ts";
import { matchCvLines } from "./cv-grounding.ts";
import { extractJobRequirements, splitRequirementText } from "./job-requirements.ts";

export const interviewKinds = ["General", "Recruiter", "Hiring manager", "Executive", "Professional"] as const;
export type InterviewKind = typeof interviewKinds[number];
type Language = "he" | "en";
type Source = { id: string; eventDateTime?: string; company: string; role: string; requirements?: string; jobDescription?: string; requirementEvidence: { id?: string; requirement: string; evidence: string }[]; evidenceItems?: LinkedEvidence[] };
type Career = { professionalSummary?: string };

const questions: Record<InterviewKind, Record<Language, string[]>> = {
  General: { en: ["Why this role now?", "What achievement best demonstrates your fit?", "What do you want to clarify about the role?"], he: ["למה התפקיד הזה דווקא עכשיו?", "איזה הישג מדגים את ההתאמה שלכם?", "מה תרצו לברר לגבי התפקיד?"] },
  Recruiter: { en: ["What are your motivations for this move?", "Which experience makes you a strong candidate?", "What are your expectations for the process and role?"], he: ["מה מניע אתכם לבצע את המעבר?", "איזה ניסיון הופך אתכם למועמדים חזקים?", "מה הציפיות שלכם מהתהליך ומהתפקיד?"] },
  "Hiring manager": { en: ["How would you approach the team’s first priority?", "Describe a comparable challenge and measurable outcome.", "How do you collaborate with stakeholders?"], he: ["איך הייתם ניגשים לעדיפות הראשונה של הצוות?", "תארו אתגר מקביל ותוצאה מדידה.", "איך אתם עובדים עם ממשקים?"] },
  Executive: { en: ["How would you connect this role to business outcomes?", "Describe a difficult tradeoff you managed.", "What would you prioritize in the first 90 days?"], he: ["איך תחברו את התפקיד לתוצאות עסקיות?", "תארו החלטה מורכבת שקיבלתם.", "מה תעדיפו ב־90 הימים הראשונים?"] },
  Professional: { en: ["Walk through a relevant project, including your decisions.", "How did you measure success and address problems?", "What would you do differently next time?"], he: ["תארו פרויקט רלוונטי וההחלטות שקיבלתם.", "איך מדדתם הצלחה והתמודדתם עם בעיות?", "מה הייתם עושים אחרת בפעם הבאה?"] },
};

// A figure alone is context (team size, year, budget), not an outcome. Count a result only when an outcome verb and a quantity both appear in the same line.
export const hasStatedOutcome = (line: string) => /\b(reduc|cut|cutting|increas|improv|grew|grow|sav(ed|ing)|boost|decreas|rais(ed|ing)|lower|doubl|tripl|accelerat|shorten|drove|generat|won|achiev)\w*|הקטנ|קיצ|הגדל|שיפר|חסכ|העלי|הפחת|הגדלת|צמצ/i.test(line) && /\d/.test(line);

// Splits a CV line into an action and, only when a later clause itself states an outcome (verb plus number), a result clause. Text is never rewritten, only cut at punctuation.
export function splitActionResult(line: string) {
  const parts = line.split(/,\s+|;\s+|\s+(?=resulting in\b|which\b)/);
  for (let i = 1; i < parts.length; i++) {
    const tail = parts.slice(i).join(", ");
    if (hasStatedOutcome(tail)) return { action: parts.slice(0, i).join(", "), result: tail.replace(/[.\s]+$/, "") };
  }
  return { action: line.replace(/[.\s]+$/, ""), result: "" };
}

export function buildInterviewQuickBrief(source: Source, career: Career, kind: InterviewKind, language: Language, cvText = "") {
  const he = language === "he";
  const rows = evidenceForRequirements(source.requirementEvidence, source.evidenceItems || [], source.id).filter(row => row.requirement.trim()).slice(0, 5);
  const fallback = source.requirements?.trim() ? splitRequirementText(source.requirements) : extractJobRequirements(source.jobDescription || "");
  const requirements = rows.length ? rows : fallback.slice(0, 5).map(requirement => ({ requirement, evidence: "" }));
  const summary = career.professionalSummary?.trim();
  const section = (title: string, items: string[]) => [title, ...items.map(item => "• " + item)].join("\n");
  const intro = summary ? [he ? "תקציר מקצועי שמור — ערכו להצגה של 60–90 שניות:" : "Saved professional summary — adapt into a 60–90 second introduction:", summary] : [he ? "השלימו הצגה עצמית: ניסיון רלוונטי, הישג אמיתי ומוטיבציה לתפקיד." : "Complete your introduction: relevant experience, one real achievement, and motivation for this role."];
  const practice = requirements.map(r => he ? `איזו דוגמה אמיתית ממחישה את הדרישה: ${r.requirement}?` : `Which real example demonstrates this requirement: ${r.requirement}?`);
  const stories = requirements.filter(r => r.evidence.trim()).map(r => `${r.requirement}: ${r.evidence.trim()}\n  ${he ? "חדדו מצב, משימה, פעולה ותוצאה." : "Refine the situation, task, action and result."}`);
  const gaps = requirements.filter(r => !r.evidence.trim()).map(r => `${r.requirement} — ${he ? "לא נשמרה דוגמה מקושרת; הכינו דוגמה אמיתית או שאלה לבירור." : "No linked example saved; prepare a real example or a clarifying question."}`);
  const cvMatches = matchCvLines(requirements.filter(r => !r.evidence.trim()).map(r => r.requirement), cvText);
  const cvSection = cvText.trim() ? section(he ? "טיוטות תשובה מקורות החיים" : "Answer drafts from your CV", cvMatches.length ? [he ? "השורות נבחרו לפי התאמת מילים בלבד, לא הוכחה. ערכו לפני שימוש." : "Lines are chosen by word match only, not proof. Edit before use.", ...cvMatches.map(m => { const { action, result } = splitActionResult(m.line); return he
    ? `${m.requirement}\n  מצב: [חסר, השלימו באיזה הקשר זה קרה]\n  משימה: ${m.requirement}\n  פעולה (מקורות החיים): "${action}"\n  תוצאה: ${result ? `"${result}" (כפי שנכתב; אמתו שהיא שלכם)` : "[חסר: מה השתנה בעקבות העבודה, עם מספר אם יש]"}\n  תפקידכם בפועל: [חסר]`
    : `${m.requirement}\n  Situation: [missing: add the context it happened in]\n  Task: ${m.requirement}\n  Action (from your CV): "${action}"\n  Result: ${result ? `"${result}" (as written; verify it is yours)` : "[missing: what changed because of the work, with a number if you have one]"}\n  Your own part: [missing]`; })] : [he ? "לא נמצאה שורה קשורה בקורות החיים השמורים." : "No related line found in the saved CV."]) : "";
  return [
    `${source.role} · ${source.company}`,
    he ? "הכנה מבוססת מידע שמור. השאלות הן לתרגול בלבד; לא בוצע מחקר חיצוני." : "Preparation from saved information. Questions are practice prompts; no external research performed.",
    intro.join("\n"),
    section(he ? "שאלות לתרגול" : "Practice questions", [...questions[kind][language], ...practice]),
    section(he ? "סיפורי STAR — דוגמאות שמורות" : "STAR stories — saved examples", stories.length ? stories : [he ? "לא נשמרו דוגמאות מקושרות למשרה." : "No linked examples are saved for this role."]),
    cvSection,
    section(he ? "נושאים להשלמת הכנה" : "Preparation gaps", gaps.length ? gaps : [he ? "בדקו את דרישות המשרה והשלימו רק מידע רלוונטי." : "Review the role requirements and add only relevant information."]),
    section(he ? "שאלות למראיינים" : "Questions for interviewers", he ? ["מה ייחשב להצלחה לאחר 90 יום?", "מהו האתגר המרכזי בתפקיד?", "איך הצוות והמנהלים עובדים יחד?", "מהם השלבים הבאים בתהליך?", "האם יש תחום שכדאי להעמיק בו?"] : ["What does success look like after 90 days?", "What is the main challenge in the role?", "How do the team and leadership work together?", "What are the next steps in the process?", "Is there an area I should explore in more depth?"]),
    section(he ? "מחקר חברה — לאמת לפני הראיון" : "Company research — verify before the interview", he ? ["פעילות החברה, מוצר או שירות", "הצוות והמראיינים", "עדכונים עסקיים ואתגרי התפקיד"] : ["Company activity, product or service", "Team and interviewers", "Recent business updates and role challenges"]),
  ].filter(Boolean).join("\n\n");
}

// Readiness is derived only from what is actually saved; it never claims a finished answer.
export function interviewBriefReadiness(source: Source, career: Career, cvText = "") {
  const rows = evidenceForRequirements(source.requirementEvidence, source.evidenceItems || [], source.id).filter(row => row.requirement.trim()).slice(0, 5);
  const fallback = source.requirements?.trim() ? splitRequirementText(source.requirements) : extractJobRequirements(source.jobDescription || "");
  const requirements = rows.length ? rows : fallback.slice(0, 5).map(requirement => ({ requirement, evidence: "" }));
  const matches = matchCvLines(requirements.filter(r => !r.evidence.trim()).map(r => r.requirement), cvText);
  const withSource = requirements.filter(r => r.evidence.trim() || matches.some(m => m.requirement === r.requirement)).length;
  const withOutcome = requirements.filter(r => hasStatedOutcome(r.evidence) || matches.some(m => m.requirement === r.requirement && hasStatedOutcome(m.line))).length;
  return { total: requirements.length, withSource, withOutcome, hasSummary: Boolean(career.professionalSummary?.trim()), hasCv: Boolean(cvText.trim()), hasDate: Boolean(source.eventDateTime), hasRole: Boolean(source.role && source.company) };
}
