import { createElement as h } from "react";
import { jobMatchExplanation, resultSourceIdentity, type JobResult } from "../lib/job-results.ts";
import type { SearchProfile } from "../lib/job-search";

export function JobResultCards({ jobs, profile, language, savedUrls, onReview }: { jobs: JobResult[]; profile: SearchProfile; language: "he" | "en"; savedUrls: string[]; onReview: (job: JobResult) => void }) {
  const he = language === "he";
  const saved = new Set(savedUrls.filter(Boolean).flatMap(url => { try { return [resultSourceIdentity(url)]; } catch { return []; } }));
  return h("div", { className: "job-results-list" }, jobs.map(job => {
    const match = jobMatchExplanation(job, profile);
    const isSaved = job.sources.some(source => saved.has(resultSourceIdentity(source.url)));
    return h("article", { className: "job-result-card", key: job.id },
      h("header", null, h("h4", null, job.title), h("p", null, [job.company, job.location].filter(Boolean).join(" · "))),
      h("div", { className: "job-result-tags" },
        h("span", null, job.postedAt || (he ? "תאריך פרסום לא ידוע" : "Posting date unknown")),
        job.schedule && h("span", null, job.schedule),
        isSaved && h("strong", null, he ? "כבר שמורה אצלכם" : "Already saved")
      ),
      h("details", { className: "job-result-fit" }, h("summary", null, he ? "למה לבדוק את המשרה?" : "Why consider this role?"),
        h("p", null, match.title ? (he ? `טייטל שבחרתם מופיע בשם המשרה: ${match.title}` : `Your chosen title appears in the role: ${match.title}`) : (he ? "שם המשרה אינו תואם במדויק לטייטלים שבחרתם — בדקו את תחומי האחריות." : "The role title does not exactly match your selected titles. Review its responsibilities.")),
        match.matchedSkills.length > 0 && h("p", null, `${he ? "מוזכר בתיאור" : "Mentioned in the description"}: ${match.matchedSkills.join(", ")}`),
        match.missingRequiredSkills.length > 0 && h("p", { className: "job-result-warning" }, `${he ? "כישורים נדרשים שלא נמצאו בטקסט — יש לבדוק במקור" : "Required skills not found in this text — check the original"}: ${match.missingRequiredSkills.join(", ")}`),
        match.excluded.length > 0 && h("p", { className: "job-result-warning" }, `${he ? "מילות החרגה שמופיעות בטקסט" : "Excluded terms found in the text"}: ${match.excluded.join(", ")}`),
        h("p", null, match.locationMatch ? (he ? "המיקום שבחרתם מוזכר במיקום המשרה." : "Your requested location appears in the listing location.") : (he ? "יש לאמת מיקום ואפשרות עבודה מרחוק במודעה המקורית." : "Verify location and remote-work eligibility in the original listing.")),
        h("p", null, he ? "ההסבר מבוסס על הטקסט שהתקבל והעדפות החיפוש. הוא אינו הערכת סיכויי קבלה או אישור לעמידה בדרישות." : "This explanation uses the received text and your search preferences. It is not an assessment of hiring odds or proof that requirements are met.")
      ),
      job.description && h("details", null, h("summary", null, he ? "תיאור המשרה" : "Job description"), h("p", { className: "job-result-description" }, job.description)),
      h("nav", { "aria-label": he ? `מקורות עבור ${job.title}` : `Sources for ${job.title}`, className: "job-result-sources" }, job.sources.map(source => h("a", { key: source.url, href: source.url, target: "_blank", rel: "noopener noreferrer" }, source.name))),
      h("button", { type: "button", className: "primary-button", onClick: () => onReview(job) }, isSaved ? (he ? "פתיחת המשרה השמורה" : "Open saved job") : (he ? "בדיקה ושמירה" : "Review and save"))
    );
  }));
}
