export type CompletionLoopLanguage = "en" | "he";

export function completionLoopOptions(status: string, language: CompletionLoopLanguage) {
  const options = status === "Interview"
    ? {
        en: ["Send a thank-you note", "Prepare for the next interview", "Follow up on the hiring timeline"],
        he: ["שליחת הודעת תודה", "הכנה לראיון הבא", "מעקב אחר לוח הזמנים של התהליך"],
      }
    : status === "Offer"
      ? {
          en: ["Review the offer terms", "Prepare questions about the offer", "Set a decision deadline"],
          he: ["בדיקת תנאי ההצעה", "הכנת שאלות על ההצעה", "קביעת מועד לקבלת החלטה"],
        }
      : status === "Applied" || status === "Follow-up due"
        ? {
            en: ["Send a follow-up", "Find a contact at the company", "Prepare for a possible interview"],
            he: ["שליחת הודעת מעקב", "מציאת איש קשר בחברה", "הכנה לראיון אפשרי"],
          }
        : {
            en: ["Tailor the CV", "Decide whether to apply", "Find a contact at the company"],
            he: ["התאמת קורות החיים", "החלטה האם להגיש מועמדות", "מציאת איש קשר בחברה"],
          };
  return options[language];
}
