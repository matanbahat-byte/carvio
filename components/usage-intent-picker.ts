import { createElement } from "react";
import type { UsageIntent } from "../lib/decision-support";

export function UsageIntentPicker({ intent, language, onChange }: { intent?: UsageIntent; language: "he" | "en"; onChange: (value: UsageIntent) => void }) {
  const he = language === "he";
  const labels: [UsageIntent, string][] = [
    ["active_search", he ? "מחפש/ת עבודה עכשיו" : "Looking for work now"],
    ["better_role", he ? "עובד/ת ובוחן/ת שיפור" : "Working and exploring a better role"],
    ["market_exploration", he ? "בודק/ת את השוק" : "Exploring the market"],
    ["networking_focus", he ? "מתמקד/ת בקשרים מקצועיים" : "Focusing on professional connections"],
    ["unspecified", he ? "לדלג כרגע" : "Skip for now"],
  ];
  return createElement("label", { className: "block" },
    createElement("span", null, he ? "מה מתאים לכם כרגע? (אופציונלי)" : "What brings you here? (optional)"),
    createElement("select", { className: "form-control", value: intent || "unspecified", onChange: (event: { target: { value: string } }) => onChange(event.target.value as UsageIntent) }, labels.map(([value, label]) => createElement("option", { key: value, value }, label))),
    createElement("small", null, he ? "CARVIO יתעדף צעדים לפי המטרה. אפשר לשנות אותה בכל עת; המידע והמסננים שלכם נשמרים." : "CARVIO will prioritize actions for this goal. Change it anytime; your records and search filters stay unchanged."));
}
