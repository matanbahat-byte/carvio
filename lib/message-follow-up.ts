export function messageFollowUpTarget(context: { contactId?: string; applicationId?: string } | null, contactIds: string[], applicationIds: string[]) {
  if (context?.contactId && contactIds.includes(context.contactId)) return { kind: "contact" as const, id: context.contactId };
  if (context?.applicationId && applicationIds.includes(context.applicationId)) return { kind: "application" as const, id: context.applicationId };
  return null;
}

export function followUpDate(now: Date, days = 7) {
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

type Language = "en" | "he";

const reviewAction = {
  en: "Review the role and tailor the CV",
  he: "בדיקת התפקיד והתאמת קורות החיים",
};

export function captureReviewAction(language: Language) {
  return reviewAction[language];
}

export function captureStageChange(
  application: {
    status: string;
    capturedAt: string;
    nextStep: string;
    nextStepDue: string;
    captureNextStepEdited?: boolean;
  },
  status: string,
  language: Language,
  now = new Date(),
) {
  if (
    status !== "Applied" ||
    !["Considering", "Applied"].includes(application.status) ||
    !application.capturedAt ||
    application.captureNextStepEdited ||
    !Object.values(reviewAction).includes(application.nextStep)
  ) return {};

  return {
    nextStep: language === "he" ? "לבדוק אם התקבלה תשובה למועמדות" : "Check for a response to the application",
    nextStepDue: application.nextStepDue || followUpDate(now),
  };
}
