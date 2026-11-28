import { evidenceForRequirements, type LinkedEvidence } from "./evidence-links.ts";
import { matchCvLines } from "./cv-grounding.ts";
import { extractJobRequirements, splitRequirementText } from "./job-requirements.ts";

export const interviewKinds = ["General", "Recruiter", "Hiring manager", "Executive", "Professional"] as const;
export type InterviewKind = typeof interviewKinds[number];
type Language = "he" | "en";
type Source = { id: string; company: string; role: string; requirements?: string; jobDescription?: string; requirementEvidence: { id?: string; requirement: string; evidence: string }[]; evidenceItems?: LinkedEvidence[] };
type Career = { professionalSummary?: string };

const questions: Record<InterviewKind, Record<Language, string[]>> = {
  General: { en: ["Why this role now?", "What achievement best demonstrates your fit?", "What do you want to clarify about the role?"], he: ["למה התפקיד הזה דווקא עכשיו?", "איזה הישג מדגים את ההתאמה שלכם?", "מה תרצו לברר לגבי התפקיד?"] },
  Recruiter: { en: ["What are your motivations for this move?", "Which experience makes you a strong candidate?", "What are your expectations for the process and role?"], he: ["מה מניע אתכם לבצע את המעבר?", "איזה ניסיון הופך אתכם למועמדים חזקים?", "מה הציפיות שלכם מהתהליך ומהתפקיד?"] },
  "Hiring manager": { en: ["How would you approach the team’s first priority?", "Describe a comparable challenge and measurable outcome.", "How do you collaborate with stakeholders?"], he: ["איך הייתם ניגשים לעדיפות הראשונה של הצוות?", "תארו אתגר מקביל ותוצאה מדידה.", "איך אתם עובדים עם ממשקים?"] },
  Executive: { en: ["How would you connect this role to business outcomes?", "Describe a difficult tradeoff you managed.", "What would you prioritize in the first 90 days?"], he: ["איך תחברו את התפקיד לתוצאות עסקיות?", "תארו החלטה מורכבת שקיבלתם.", "מה תעדיפו ב־90 הימים הראשונים?"] },
  Professional: { en: ["Walk through a relevant project, including your decisions.", "How did you measure success and address problems?", "What would you do differently next time?"], he: ["תארו פרויקט רלוונטי וההחלטות שקיבלתם.", "איך מדדתם הצלחה והתמודדתם עם בעיות?", "מה הייתם עושים אחרת בפעם הבאה?"] },
};

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
  const cvSection = cvText.trim() ? section(he ? "שורות מקורות החיים שנראות קשורות (התאמת מילים בלבד, לא הוכחה)" : "Saved CV lines that look related (word match only, not proof)", cvMatches.length ? cvMatches.map(m => he ? `${m.requirement}\n  מקורות החיים: "${m.line}"\n  עדיין חסר: מצב, תפקידכם בפועל ותוצאה. ערכו רק אם נכון.` : `${m.requirement}\n  From your CV: "${m.line}"\n  Still missing: the situation, your own role and the result. Edit only if true.`) : [he ? "לא נמצאה שורה קשורה בקורות החיים השמורים." : "No related line found in the saved CV."]) : "";
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
