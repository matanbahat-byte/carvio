import type { MessageProfile } from "./decision-support";

type CareerProfile = { name?: string; targetRole?: string; professionalSummary?: string };

// Only reuse facts the user saved. A job-specific example takes priority over a
// general career summary; CV text is never silently inserted into outreach.
export function savedCareerMessageFields(profile: CareerProfile, job?: { role?: string; evidence?: string }): Pick<MessageProfile, "senderName" | "role" | "value"> {
  return {
    senderName: profile.name?.trim() || "",
    role: job?.role?.trim() || profile.targetRole?.trim() || "",
    value: job?.evidence?.trim() || profile.professionalSummary?.trim() || "",
  };
}

export function careerCvOptions(text: string) {
  return [...new Set(text.split(/\r?\n/).map(line => line.replace(/^\s*[•▪◦*\-]\s*/, "").trim())
    .filter(line => line.length >= 18 && line.length <= 180 && !/@|https?:\/\/|\b\d[\d\s()+-]{7,}\d\b/i.test(line)))].slice(0, 12);
}
