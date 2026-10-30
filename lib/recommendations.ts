export type NextBestAction = { id: string; score: number; label: string; detail: string; target: string; kind: string; applicationId?: string; contactId?: string; intent?: "open" | "message" | "calendar" | "recover" };
type ApplicationSignal = {id:string;company:string;role:string;status:string;eventDateTime:string;eventType:string;lastActivityAt?:string;appliedDate:string;nextStep:string;nextStepDue:string;contactName:string;linkedContactIds?:string[];priority:string;trafficLight:string};
type ContactSignal = {id:string;company:string;name:string;linkedApplicationId?:string;nextAction?:string;nextActionDue:string;lastContactDate:string};
export function recommendationKey(action: NextBestAction) { return `${action.id}:${action.label}`; }
export function rankNextActions({applications, contacts, recoveryEntries, dailyMood, language, now, usageIntent, dismissed = [], formatDate = (value: string) => value}: {applications:ApplicationSignal[];contacts:ContactSignal[];recoveryEntries:{applicationId:string}[];dailyMood:string;language:"he"|"en";now:number;usageIntent?:string;dismissed?:string[];formatDate?:(value:string,withTime?:boolean)=>string}): NextBestAction[] {
  const isClosedApplicationStatus = (status: string) => ["Accepted","Rejected","Withdrawn"].includes(status);
  const isPast = (value: string) => Number.isFinite(Date.parse(value)) && Date.parse(value) < now;

    const actions: NextBestAction[] = [];

    const day = 86400000;
    const daysSince = (value: string) => {
      const timestamp = value ? Date.parse(value) : Number.NaN;
      return Number.isFinite(timestamp) ? Math.max(0, Math.floor((now - timestamp) / day)) : 0;
    };
    const daysUntil = (value: string) => {
      const timestamp = value ? Date.parse(value) : Number.NaN;
      return Number.isFinite(timestamp) ? Math.ceil((timestamp - now) / day) : null;
    };
    applications.forEach((item) => {
      const eventAt = item.eventDateTime ? new Date(item.eventDateTime).getTime() : 0;
      const activityAt = item.lastActivityAt || item.appliedDate;
      const staleDays = daysSince(activityAt);
      const dueDays = daysUntil(item.nextStepDue);
      if (!isClosedApplicationStatus(item.status) && item.nextStep.trim() && !item.nextStepDue) actions.push({ id: `app-undated-${item.id}`, score: 70, label: item.nextStep, detail: language === "he" ? `${item.role} ב־${item.company} · פעולה ששמרתם, ללא תאריך יעד.` : `${item.role} at ${item.company} · Your saved action, with no due date.`, target: "applications", kind: language === "he" ? "הצעד שבחרתם" : "Your next move", applicationId: item.id, intent: "open" });
      const overdueDays = dueDays !== null && dueDays < 0 ? Math.abs(dueDays) : 0;
      const hasContact = Boolean(item.contactName || item.linkedContactIds?.length || contacts.some((contact) => contact.linkedApplicationId === item.id || contact.company.trim().toLowerCase() === item.company.trim().toLowerCase()));
      if (!isClosedApplicationStatus(item.status) && eventAt >= now && eventAt - now <= 72 * 60 * 60 * 1000) actions.push({ id: `app-event-${item.id}`, score: 140 - ((eventAt - now) / 3600000), label: language === "he" ? `הכנה ל${item.eventType || "ראיון"} עבור ${item.company}` : `Prepare for your ${item.eventType || "interview"} at ${item.company}`, detail: language === "he" ? `המועד הוא ${formatDate(item.eventDateTime, true)}. עברו על סיפורי STAR והשאלות שלכם.` : `It is scheduled for ${formatDate(item.eventDateTime, true)}. Review your STAR stories and questions.`, target: "applications", kind: language === "he" ? "פגישה קרובה" : "Meeting soon", applicationId: item.id, intent: "open" });
      if (!isClosedApplicationStatus(item.status) && dueDays !== null && dueDays >= 0 && dueDays <= 7) actions.push({ id: `app-upcoming-${item.id}`, score: item.status === "Offer" ? 132 - dueDays : 104 - dueDays, label: item.nextStep || (language === "he" ? `הצעד הבא עבור ${item.company}` : `Next step for ${item.company}`), detail: language === "he" ? `${item.role} · היעד הוא ${formatDate(item.nextStepDue)}` : `${item.role} · due ${formatDate(item.nextStepDue)}`, target: "applications", kind: language === "he" ? "יעד קרוב" : "Due soon", applicationId: item.id, intent: "open" });
      if (!isClosedApplicationStatus(item.status) && overdueDays > 0 && overdueDays <= 21) actions.push({ id: `app-due-${item.id}`, score: 125 - Math.min(18, overdueDays / 2), label: item.nextStep || (language === "he" ? `פעולת המשך עבור ${item.company}` : `Follow up with ${item.company}`), detail: language === "he" ? `${item.role} · היעד חלף לפני ${overdueDays} ימים` : `${item.role} · due ${overdueDays} days ago`, target: "applications", kind: language === "he" ? "נדרש עכשיו" : "Needs action", applicationId: item.id, intent: "message" });
      if (!isClosedApplicationStatus(item.status) && (overdueDays > 21 || staleDays >= 30)) actions.push({ id: `app-review-${item.id}`, score: 82 + (item.priority === "High" ? 8 : 0), label: language === "he" ? `בדיקה או ארכוב של ${item.company}` : `Review or archive ${item.company}`, detail: language === "he" ? `לא תועדה פעילות כבר ${staleDays || overdueDays} ימים. בדקו אם התהליך עדיין פעיל.` : `No activity has been recorded for ${staleDays || overdueDays} days. Check whether this process is still active.`, target: "applications", kind: language === "he" ? "בדיקת סטטוס" : "Status check", applicationId: item.id, intent: "open" });
      if (!isClosedApplicationStatus(item.status) && item.trafficLight === "yellow" && staleDays >= 10 && staleDays < 30 && overdueDays <= 21) actions.push({ id: `app-wait-${item.id}`, score: 98 + Math.min(10, staleDays / 2), label: language === "he" ? `בדיקת התהליך הממתין ב־${item.company}` : `Check the waiting process at ${item.company}`, detail: language === "he" ? `לא תועדה תנועה משמעותית כבר ${staleDays} ימים.` : `No meaningful movement has been recorded for ${staleDays} days.`, target: "applications", kind: language === "he" ? "תהליך ממתין" : "Stale waiting", applicationId: item.id, intent: "message" });
      if (item.priority === "High" && !hasContact && !["Accepted", "Rejected", "Withdrawn"].includes(item.status)) actions.push({ id: `app-contact-${item.id}`, score: 88, label: language === "he" ? `מציאת קשר רלוונטי ב־${item.company}` : `Add a relevant contact at ${item.company}`, detail: language === "he" ? "זו מועמדות בעדיפות גבוהה ללא מגייס, מנהל מגייס או רפרל מקושר." : "This high-priority application has no linked recruiter, hiring manager, or referral.", target: "networking", kind: language === "he" ? "חסר קשר" : "Contact gap", applicationId: item.id, intent: "open" });
      if (!["Accepted", "Rejected", "Withdrawn"].includes(item.status) && !item.nextStep.trim()) actions.push({ id: `app-plan-${item.id}`, score: 78, label: language === "he" ? `הגדרת הצעד הבא עבור ${item.company}` : `Define the next move for ${item.company}`, detail: language === "he" ? `למועמדות לתפקיד ${item.role} עדיין אין פעולה ברורה.` : `The ${item.role} application does not yet have a clear next action.`, target: "applications", kind: language === "he" ? "נדרש תכנון" : "Needs a plan", applicationId: item.id, intent: "open" });
      if (item.status === "Rejected" && !recoveryEntries.some((entry) => entry.applicationId === item.id)) actions.push({ id: `reset-${item.id}`, score: dailyMood === "difficult" ? 115 : 42, label: language === "he" ? `איפוס עדין לאחר התהליך ב־${item.company}` : `Take a gentle reset after ${item.company}`, detail: language === "he" ? "השהו, שמרו רק את מה שמועיל ובחרו צעד קטן שבשליטתכם." : "Pause, keep only what helps, and choose one manageable step within your control.", target: "carvio-reset", kind: language === "he" ? "התאוששות" : "Recover", applicationId: item.id, intent: "recover" });
    });
    contacts.forEach((item) => {
      if (item.nextAction?.trim() && !item.nextActionDue) actions.push({ id: `contact-plan-${item.id}`, score: usageIntent === "networking_focus" ? 92 : 68, label: item.nextAction, detail: language === "he" ? `הפעולה ששמרתם עבור ${item.name}, ללא תאריך יעד.` : `Your saved action for ${item.name}, with no due date.`, target: "networking", kind: language === "he" ? "קשר מקצועי" : "Professional connection", contactId: item.id, intent: "open" });
      const overdueDays = item.nextActionDue && isPast(item.nextActionDue) ? daysSince(item.nextActionDue) : 0;
      if (overdueDays > 0 && overdueDays <= 21) actions.push({ id: `contact-due-${item.id}`, score: 108 - Math.min(12, overdueDays / 2), label: item.nextAction || (language === "he" ? `חזרה אל ${item.name}` : `Reconnect with ${item.name}`), detail: language === "he" ? `${item.name}${item.company ? ` · ${item.company}` : ""} · היעד חלף לפני ${overdueDays} ימים` : `${item.name}${item.company ? ` · ${item.company}` : ""} · due ${overdueDays} days ago`, target: "networking", kind: language === "he" ? "פעולת נטוורקינג" : "Networking follow-up", contactId: item.id, intent: "open" });
    });
    const lastMeaningfulActivity = [...applications.map((item) => item.lastActivityAt || item.appliedDate), ...contacts.map((item) => item.lastContactDate)].filter(Boolean).map(Date.parse).sort((a, b) => b - a)[0] || 0;
    const inactiveDays = lastMeaningfulActivity ? Math.floor((now - lastMeaningfulActivity) / 86400000) : 0;
    if (inactiveDays >= 4) actions.push({ id: "restart-momentum", score: 62 + Math.min(14, inactiveDays), label: language === "he" ? "בחירת פעולה קטנה לחידוש התנופה" : "Choose one small action to restart momentum", detail: language === "he" ? `לא תועדה פעילות משמעותית כבר ${inactiveDays} ימים. אין צורך להשלים הכול היום.` : `No meaningful activity has been recorded for ${inactiveDays} days. You do not need to catch up all at once.`, target: "applications", kind: language === "he" ? "חידוש תנופה" : "Restart", intent: "open" });
    if (actions.filter(action => !dismissed.includes(recommendationKey(action))).length === 0) actions.push({ id: "healthy", score: 10, label: language === "he" ? "התהליך בשליטה" : "Your pipeline is under control", detail: language === "he" ? "הוסיפו הזדמנות או קבעו שיחת נטוורקינג כדי לשמור על תנופה רגועה." : "Add an opportunity or schedule a networking conversation to maintain calm momentum.", target: "applications", kind: language === "he" ? "תנופה" : "Momentum", intent: "open" });
    const seenEntities = new Set<string>();
    let staleReviewIncluded = false;
    return actions.filter(action => !dismissed.includes(recommendationKey(action))).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).filter((action) => {
      const entityKey = action.applicationId ? `application-${action.applicationId}` : action.contactId ? `contact-${action.contactId}` : action.id;
      if (seenEntities.has(entityKey)) return false;
      if (action.id.startsWith("app-review-")) {
        if (staleReviewIncluded) return false;
        staleReviewIncluded = true;
      }
      seenEntities.add(entityKey);
      return true;
    }).slice(0, 4);

}
