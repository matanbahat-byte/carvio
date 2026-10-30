export type UsageIntent = "active_search" | "better_role" | "market_exploration" | "networking_focus" | "unspecified";
export function isCompatibleRecord(value: unknown, defaults: Record<string, unknown>): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.entries(defaults).every(([key, fallback]) => {
    const stored = record[key];
    if (stored === undefined) return true;
    if (Array.isArray(fallback)) return Array.isArray(stored) && (!fallback.length || typeof fallback[0] !== "object" || stored.every(item => isCompatibleRecord(item, fallback[0])));
    if (fallback && typeof fallback === "object") return isCompatibleRecord(stored, fallback as Record<string, unknown>);
    return typeof stored === typeof fallback;
  });
}
export type AiEvidenceInput = { task: string; tool: string; judgment: string; outcome: string };
export type EvidenceItem = { id: string; applicationId: string; text: string; requirementIds: string[] };
export function aiEvidenceBullet(input: AiEvidenceInput, requirementIds: string[], language: "he" | "en") {
  if (!requirementIds.length || [input.task, input.judgment, input.outcome].some(value => value.trim().length < 8) || input.tool.trim().length < 2) return "";
  return language === "he" ? `במשימה: ${input.task.trim()}, השתמשתי ב־${input.tool.trim()}; שיקול הדעת והאחריות שלי: ${input.judgment.trim()}; התוצאה שתועדה: ${input.outcome.trim()}.` : `For ${input.task.trim()}, used ${input.tool.trim()}; retained human responsibility for ${input.judgment.trim()}; observed outcome: ${input.outcome.trim()}.`;
}
export type MessageProfile = {
  recipientType: "Recruiter" | "Hiring manager" | "Referral" | "Networking contact";
  tone: "Warm & professional" | "Direct & confident" | "Friendly & concise" | "Senior & strategic";
  intent: "Introduce myself" | "Ask for a referral" | "Follow up after applying" | "Request a conversation" | "Thank them";
  recipientName: string;
  recipientEmail: string;
  company: string;
  role: string;
  senderName: string;
  value: string;
  context: string;
};
export function messageSubject(profile: MessageProfile, language: "he" | "en") {
  const role = profile.role.trim() || (language === "he" ? "ההזדמנות" : "the opportunity");
  const company = profile.company.trim();
  const companySuffix = company ? (language === "he" ? ` ב־${company}` : ` at ${company}`) : "";
  const labels: Record<MessageProfile["intent"], { en: string; he: string }> = {
    "Introduce myself": { en: `Introduction — ${role}${companySuffix}`, he: `היכרות מקצועית — ${role}${companySuffix}` },
    "Ask for a referral": { en: `Referral request — ${role}${companySuffix}`, he: `בקשת הפניה — ${role}${companySuffix}` },
    "Follow up after applying": { en: `Following up — ${role}${companySuffix}`, he: `פעולת המשך — ${role}${companySuffix}` },
    "Request a conversation": { en: `Conversation about ${role}${companySuffix}`, he: `שיחה על ${role}${companySuffix}` },
    "Thank them": { en: `Thank you — ${role}${companySuffix}`, he: `תודה — ${role}${companySuffix}` },
  };
  return labels[profile.intent][language];
}

export function generateOutreachMessage(profile: MessageProfile, language: "he" | "en") {
  if (!hasPersonalAnchor(profile)) return "";
  const recipientName = profile.recipientName.trim();
  const role = profile.role.trim();
  const company = profile.company.trim();
  const sender = profile.senderName.trim();
  const value = profile.value.trim();
  const context = profile.context.trim();
  const asSentence = (text: string) => text && !/[.!?…]$/.test(text) ? `${text}.` : text;
  if (language === "he") {
    const greeting = recipientName ? `שלום ${recipientName},` : "שלום,";
    const opportunity = role && company ? `לתפקיד ${role} ב־${company}` : role ? `לתפקיד ${role}` : company ? `להזדמנויות ב־${company}` : "להזדמנויות מקצועיות רלוונטיות";
    const closeLabel = profile.tone === "Senior & strategic" ? "בברכה ובהערכה," : profile.tone === "Warm & professional" ? "תודה רבה," : "בברכה,";
    const close = sender ? `${closeLabel}\n${sender}` : closeLabel;
    const openingByIntent: Record<MessageProfile["intent"], string> = {
      "Introduce myself": `אני פונה אליך כדי להציג את עצמי ולהביע עניין ${opportunity}.`,
      "Ask for a referral": `אני בוחן/ת אפשרות להגיש מועמדות ${opportunity}, ואשמח להתייעץ איתך.`,
      "Follow up after applying": role && company ? `רציתי לבצע פעולת המשך עניינית בנוגע למועמדות שלי לתפקיד ${role} ב־${company}.` : role ? `רציתי לבצע פעולת המשך עניינית בנוגע למועמדות שלי לתפקיד ${role}.` : company ? `רציתי לבצע פעולת המשך עניינית בנוגע למועמדות שהגשתי ל־${company}.` : "רציתי לבצע פעולת המשך עניינית בנוגע למועמדות שהגשתי לאחרונה.",
      "Request a conversation": role || company ? `אשמח לקיים שיחה קצרה על ${opportunity.replace(/^ל/, "")}.` : "אשמח לקיים שיחה מקצועית קצרה וללמוד מנקודת המבט שלך.",
      "Thank them": role && company ? `רציתי להודות לך על הזמן והתמיכה סביב ההזדמנות לתפקיד ${role} ב־${company}.` : role ? `רציתי להודות לך על הזמן והתמיכה סביב ההזדמנות לתפקיד ${role}.` : company ? `רציתי להודות לך על הזמן והתמיכה סביב ההזדמנויות ב־${company}.` : "רציתי להודות לך על הזמן, העזרה והתמיכה.",
    };
    const askByRecipient: Record<MessageProfile["recipientType"], string> = {
      Recruiter: role ? "אם התפקיד עדיין פתוח, אשמח להכוונה לגבי השלב הבא בתהליך." : "אם קיימת הזדמנות רלוונטית, אשמח להכוונה לגבי הצעד הבא.",
      "Hiring manager": "אם זה מועיל, אשמח לשתף בדוגמה קצרה לאופן שבו הייתי ניגש/ת לסדרי העדיפויות של הצוות בתפקיד.",
      Referral: profile.intent === "Ask for a referral" ? "אם לאחר עיון ברקע שלי תרגישו בנוח להפנות אותי, אעריך זאת מאוד; גם נקודת מבט כנה בלבד תסייע לי." : "אשמח לכל נקודת מבט שנוח לך לשתף על הצוות ועל התפקיד.",
      "Networking contact": "האם יתאים לך לקיים שיחה קצרה של 15 דקות בימים הקרובים? אשמח להתאים את עצמי לזמן שנוח לך.",
    };
    const paragraphs = [openingByIntent[profile.intent], asSentence(context), valueSentence(value, language), profile.intent === "Thank them" ? "" : askByRecipient[profile.recipientType]].filter(Boolean);
    return `${greeting}\n\n${paragraphs.join("\n\n")}\n\n${close}`;
  }
  const greeting = recipientName ? `${profile.tone === "Friendly & concise" ? "Hi" : "Hello"} ${recipientName},` : "Hello,";
  const opportunity = role && company ? `the ${role} opportunity at ${company}` : role ? `the ${role} opportunity` : company ? `opportunities at ${company}` : "relevant professional opportunities";
  const closeLabel = profile.tone === "Direct & confident" ? "Best," : profile.tone === "Senior & strategic" ? "Kind regards," : "Warmly,";
  const close = sender ? `${closeLabel}\n${sender}` : closeLabel;
  const openingByIntent: Record<MessageProfile["intent"], string> = {
    "Introduce myself": `I’m reaching out to introduce myself and express my interest in ${opportunity}.`,
    "Ask for a referral": `I’m considering ${opportunity} and hoped to ask for your perspective.`,
    "Follow up after applying": role ? `I wanted to follow up thoughtfully on my recent application for ${opportunity}.` : company ? `I wanted to follow up thoughtfully on my recent application to ${company}.` : "I wanted to follow up thoughtfully on an application I recently submitted.",
    "Request a conversation": role || company ? `I’d value a brief conversation about ${opportunity}.` : "I’d value a brief professional conversation and the chance to learn from your perspective.",
    "Thank them": role || company ? `Thank you for your time and support regarding ${opportunity}.` : "Thank you for your time, help, and support.",
  };
  const askByRecipient: Record<MessageProfile["recipientType"], string> = {
    Recruiter: role ? "If the role is still active, I’d appreciate any guidance on the next step in the process." : "If there is a relevant active opportunity, I’d appreciate any guidance on the next step.",
    "Hiring manager": "If useful, I’d be glad to share a concise example of how I would approach the team’s priorities in this role.",
    Referral: profile.intent === "Ask for a referral" ? "If, after reviewing my background, you feel comfortable referring me, I would be very grateful—though your honest perspective alone would already help." : "I’d appreciate any perspective you’re comfortable sharing about the team and the role.",
    "Networking contact": "Would you be open to a short 15-minute conversation in the coming days? I’ll gladly work around your schedule.",
  };
  const paragraphs = [openingByIntent[profile.intent], asSentence(context), valueSentence(value, language), profile.intent === "Thank them" ? "" : askByRecipient[profile.recipientType]].filter(Boolean);
  return `${greeting}\n\n${paragraphs.join("\n\n")}\n\n${close}`;
}
export function normalizeUsageIntent(value: unknown): UsageIntent {
  const aliases: Record<string, UsageIntent> = { active: "active_search", improving: "better_role", market: "market_exploration", networking: "networking_focus", skip: "unspecified" };
  const valid = ["active_search", "better_role", "market_exploration", "networking_focus", "unspecified"];
  return typeof value === "string" ? aliases[value] || (valid.includes(value) ? value as UsageIntent : "unspecified") : "unspecified";
}
export function goalAction(value: unknown) {
  const intent = normalizeUsageIntent(value);
  return ({ active_search: "opportunity", better_role: "target", market_exploration: "scan", networking_focus: "connection", unspecified: "opportunity" } as const)[intent];
}
export type SourceType = "LinkedIn" | "Google" | "Company careers" | "Referral" | "Recruiter" | "Manual" | "Other";
export function normalizeSource(source: unknown): SourceType {
  if (typeof source !== "string") return "Other";
  const label = source.trim().toLowerCase();
  if (/^(linkedin|לינקדאין)$/.test(label)) return "LinkedIn";
  if (/^(google|google jobs|גוגל)$/.test(label)) return "Google";
  if (/^(company careers|company website|career page|אתר החברה)$/.test(label)) return "Company careers";
  if (/^(referral|הפניה)$/.test(label)) return "Referral";
  if (/^(recruiter|מגייס|מגייסת)$/.test(label)) return "Recruiter";
  if (/^(manual|ידני)$/.test(label)) return "Manual";
  return "Other";
}
export function migrateSource<T extends { source?: unknown; sourceUrl?: unknown; jobUrl?: unknown; sourceType?: unknown }>(value: T) {
  const source = typeof value.source === "string" ? value.source : "";
  const sourceUrl = typeof value.jobUrl === "string" && value.jobUrl ? value.jobUrl : typeof value.sourceUrl === "string" ? value.sourceUrl : "";
  return { source, sourceUrl, sourceType: normalizeSource(source || value.sourceType) };
}
export function safeSourceUrl(value: string) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
type SourceRecord = { source: string; status: string; appliedDate?: string; processStages?: { name: string }[] };
export function sourceOutcomes(records: SourceRecord[]) {
  const rows = new Map<SourceType, { source: SourceType; opportunities: number; submitted: number; interviews: number; rate: number | null }>();
  for (const item of records) {
    const key = normalizeSource(item.source);
    const row = rows.get(key) || { source: key, opportunities: 0, submitted: 0, interviews: 0, rate: null };
    row.opportunities++;
    const submitted = item.status !== "Considering" && (Boolean(item.appliedDate) || ["Applied", "Interview", "Offer", "Accepted", "Follow-up due"].includes(item.status));
    const interviewed = ["Interview", "Offer", "Accepted"].includes(item.status) || item.processStages?.some(stage => /interview|ראיון/i.test(stage.name));
    if (submitted) { row.submitted++; if (interviewed) row.interviews++; }
    row.rate = row.submitted >= 5 ? row.interviews / row.submitted : null;
    rows.set(key, row);
  }
  return [...rows.values()];
}
export function hasPersonalAnchor(profile: { context: string; value: string }) {
  return profile.context.trim().length >= 12 || profile.value.trim().length >= 12;
}
export function valueSentence(value: string, language: "en" | "he") {
  const text = value.trim();
  if (!text) return "";
  const sentence = /^(I\b|My\b|We\b|אני\b|הובלתי|יצרתי|פיתחתי)/i.test(text) ? text : `${language === "he" ? "הניסיון הרלוונטי שלי:" : "Relevant experience:"} ${text}`;
  return /[.!?…]$/.test(sentence) ? sentence : `${sentence}.`;
}
export function linkContactIds(ids: string[] = [], contactId: string, linked: boolean) {
  return linked ? [...new Set([...ids, contactId])] : ids.filter(id => id !== contactId);
}
export function privateEventProperties(properties: Record<string, unknown>) {
  const allowed = new Set(["status", "days", "sourceType", "intent", "method", "count"]);
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => allowed.has(key) && ["string", "number", "boolean"].includes(typeof value))) as Record<string, string | number | boolean>;
}
