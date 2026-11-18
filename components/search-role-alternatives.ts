import { createElement as h } from "react";
import type { SearchProfile } from "../lib/job-search";

export function SearchRoleAlternatives({ profile, selected, suggestions: suggested, language, onChange }: { profile: SearchProfile; selected: string[]; suggestions: string[]; language: "he" | "en"; onChange: (value: string) => void }) {
  const he = language === "he";
  const suggestions = [...new Set([...suggested, ...selected])];
  return h("fieldset", { className: "search-title-alternatives" },
    h("legend", null, he ? "אותו כיוון, טייטלים נוספים" : "One direction, more job titles"),
    h("p", { className: "search-skills-helper", id: "alternative-role-help" }, he ? "בחרו עד ארבעה טייטלים נוספים. נחפש כל אחד מהם בכל המקורות, עם אותם מסננים. בדקו שהאחריות והדרגה מתאימות לכם." : "Choose up to four additional titles. Search any of them across sources with the same filters. Check that responsibilities and seniority suit you."),
    h("div", { className: "search-title-chips" }, suggestions.map(term => {
      const active = selected.includes(term);
      return h("button", { key: term, type: "button", "aria-pressed": active, disabled: !active && selected.length >= 4, className: `skill-chip ${active ? "skill-chip-selected" : ""}`, onClick: () => onChange((active ? selected.filter(item => item !== term) : [...selected, term]).join(", ")) }, `${active ? "✓" : "+"} ${term}`);
    })),
    h("label", { htmlFor: "alternative-role-input" }, he ? "טייטלים לבחירתכם, מופרדים בפסיקים" : "Your own titles, separated by commas"),
    h("input", { id: "alternative-role-input", className: "form-control", value: profile.alternativeRoles || "", "aria-describedby": "alternative-role-help", onChange: (event: { target: { value: string } }) => onChange(event.target.value), placeholder: he ? "למשל Head of Planning, Global Planning Director" : "e.g. Head of Planning, Global Planning Director" })
  );
}
