import { createElement as h, type ReactNode } from "react";
import { localizedSearchFilter, type JobSearchSource, type SearchProfile } from "../lib/job-search.ts";

export function SearchSourceCards({ sources, profile, language, careerUrl, anyTimeUrl, onCopy, onOpen, filterNotice }: { sources: JobSearchSource[]; profile: SearchProfile; language: "he" | "en"; careerUrl: string; anyTimeUrl?: string; onCopy: (query: string) => void; onOpen: (source: "LinkedIn" | "Google" | "Indeed") => void; filterNotice: (source: JobSearchSource) => ReactNode }) {
  const he = language === "he";
  const ordered = ["linkedin", "indeed", "google"].map(id => sources.find(source => source.id === id)).filter((source): source is JobSearchSource => Boolean(source));
  const external = (label: string, href: string, primary = false, id?: string, onClick?: () => void) => h("a", { href, target: "_blank", rel: "noopener noreferrer", className: primary ? "search-source-open" : "text-button", "data-testid": id, onClick }, label);
  return h("div", { className: "search-source-grid", "aria-label": he ? "בחירת מקור חיפוש" : "Choose a search source" }, ordered.map(source => {
    const google = source.id === "google";
    const indeed = source.id === "indeed";
    const provider = google ? "Google" : indeed ? "Indeed" : "LinkedIn";
    return h("article", { key: source.id, className: "search-source-card search-source-featured group", "data-search-source": source.id },
      h("span", { className: "search-source-icon", "aria-hidden": true }, source.emoji),
      h("h3", { className: "search-source-title" }, google ? (he ? "Google — משרות ברחבי הרשת" : "Google — jobs across the web") : indeed ? "Indeed" : "LinkedIn"),
      h("p", { className: "search-source-description" }, google ? (he ? "חיפוש מודעות בלוחות דרושים, באתרי חברות ובאתרי קריירה — לא רק ב־LinkedIn." : "Search job boards, company websites and career pages — not just LinkedIn.") : source.description),
      h("div", { className: "search-source-signals" }, h("span", null, source.freshness), h("span", null, [profile.location, localizedSearchFilter(profile.country, language)].filter(Boolean).join(" · "))),
      h("div", { className: "search-source-actions" }, external(he ? `חיפוש ב־${provider}` : `Search ${provider}`, source.url, true, `search-route-${google ? 1 : indeed ? 2 : 0}`, () => onOpen(provider))),
      google && h("div", { className: "search-source-actions" },

        anyTimeUrl && external(he ? "מעט תוצאות? חיפוש ללא הגבלת זמן" : "Few results? Search any time", anyTimeUrl, false, "search-google-anytime", () => onOpen("Google"))
      ),
      google && h("p", { className: "text-sm text-slate-500" }, he ? "התוצאות נפתחות ב־Google. בדקו במודעה המקורית שהמשרה עדיין פעילה. מסנן הזמן מתייחס לתאריך שבאינדקס, לא בהכרח לתאריך הפרסום." : "Results open on Google. Check the original listing is still active. Google's date filter reflects its indexed date, not necessarily the job posting date."),
      h("details", null, h("summary", null, he ? "פרטי החיפוש והמסננים" : "Search query and filters"),
        filterNotice(source),
        h("div", { className: "search-query-preview" }, h("span", null, he ? "מילות החיפוש שנשלחות" : "Keywords being sent"), h("code", { dir: "ltr" }, source.query)),
        h("button", { type: "button", className: "text-button", onClick: () => onCopy(source.query) }, he ? "העתקת מילות החיפוש" : "Copy search query")
      )
    );
  }), h("article", { className: "search-source-card search-source-featured", "data-search-source": "careers" },
    h("span", { className: "search-source-icon", "aria-hidden": true }, "🏢"),
    h("h3", { className: "search-source-title" }, he ? "ישירות באתרי החברות" : "Company career pages"),
    h("p", { className: "search-source-description" }, he ? "עמודי קריירה של מעסיקים במערכות גיוס כמו Greenhouse, Lever ו־Ashby. חיפוש ממוקד שאינו כולל את כל אתרי החברות." : "Employer career pages hosted on hiring platforms such as Greenhouse, Lever and Ashby. A focused search that does not cover every company website."),
    h("div", { className: "search-source-actions" }, external(he ? "חיפוש באתרי חברות" : "Search company sites", careerUrl, true, "search-career-pages", () => onOpen("Google"))),
    h("p", { className: "text-sm text-slate-500" }, he ? "התוצאות נפתחות ב־Google. בדקו באתר החברה את תאריך הפרסום, המיקום וזמינות המשרה. מסנני הדרגה, סוג ההעסקה והרדיוס אינם מופעלים במסלול זה." : "Results open in Google. Verify posting date, location and availability on the company site. Seniority, employment type and radius filters are not applied on this route.")
  ));
}
