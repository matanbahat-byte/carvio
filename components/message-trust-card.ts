import { createElement as h } from "react";
import type { MessageProvenance } from "../lib/message-provenance";

export function MessageTrustCard({ snapshot, changed, edited, language }: { snapshot: MessageProvenance | null; changed: boolean; edited: boolean; language: "he" | "en" }) {
  const he = language === "he";
  const labels: Record<string, string> = he
    ? { intent: "מטרת ההודעה", tone: "טון", recipientType: "סוג הנמען", recipientName: "שם הנמען", company: "חברה", role: "תפקיד היעד", senderName: "שם השולח", context: "סיבה או שאלה אישית", value: "ערך רלוונטי" }
    : { intent: "message goal", tone: "tone", recipientType: "recipient type", recipientName: "recipient name", company: "company", role: "target role", senderName: "sender name", context: "specific reason or question", value: "relevant value" };
  return h("aside", { className: "message-application-context", "aria-label": he ? "איך CARVIO עזר" : "How CARVIO helped" }, h("div", null,
    h("strong", null, he ? "איך CARVIO עזר" : "How CARVIO helped"),
    h("p", null, snapshot ? `${he ? "שימשו בעת יצירת הטיוטה" : "Used when the draft was generated"}: ${Object.keys(snapshot.inputs).map(key => labels[key]).join(he ? " · " : ", ")}.` : (he ? "אין תיעוד של פרטי היצירה לטיוטה הזו." : "Generation inputs are unavailable for this draft.")),
    changed && h("p", { role: "status" }, he ? "פרטי הטופס השתנו מאז היצירה. הטיוטה והנושא לא עודכנו אוטומטית; בדקו אותם או צרו טיוטה מחדש. יצירה מחדש תחליף את העריכות." : "Form details changed since generation. The draft and subject were not updated automatically. Review them or create a new draft; regenerating replaces your edits."),
    edited && h("p", null, he ? "הטיוטה או הנושא נערכו ידנית לאחר היצירה. הרשימה מתארת את הקלט המקורי, לא אימות של העריכות." : "The draft or subject was manually edited after generation. The list describes the original inputs, not verification of your edits."),
    h("p", null, he ? "לא אומת: ניסיון, פרטי משרה וטענות שבטקסט — יש לבדוק לפני העתקה." : "Not verified: experience, vacancy details and claims in the text — check before copying."),
    h("p", null, he ? "שיטת יצירה: תבנית מקומית. CARVIO לא שלח את ההודעה." : "Generation method: local template. CARVIO did not send this message.")
  ));
}
