type Language = "he" | "en";

export type SearchProfile = {
  role: string;
  filterRole: string;
  location: string;
  country: string;
  radius: string;
  skills: string;
  skillsMode?: "preference" | "required";
  lastSearchedAt?: string;
  seniority: string;
  workModel: string;
  employmentType: string;
  datePosted: string;
  industry: string;
  exclude: string;
};

export type SearchOutcome = "unreviewed" | "found" | "none";

export type JobSearchSource = {
  name: string;
  emoji: string;
  featured: boolean;
  freshness: string;
  accuracy: string;
  query: string;
  description: string;
  url: string;
  directUrl?: string;
  applied: string[];
  notApplied: string[];
};


export const emptySearchProfile: SearchProfile = { role: "", filterRole: "", location: "", country: "Netherlands", radius: "25", skills: "", skillsMode: "preference", seniority: "", workModel: "", employmentType: "Full-time", datePosted: "Past week", industry: "", exclude: "" };
const supplyChainSkillSuggestions = ["Inventory management", "Demand planning", "Procurement", "Logistics", "S&OP", "ERP", "Supplier management", "Warehouse operations", "Forecasting"];
const hrSkillSuggestions = ["Business partnering", "Talent management", "Employee relations", "Organizational development", "Change management", "Workforce planning", "Coaching", "HR analytics", "People strategy", "Recruitment", "Compensation & benefits", "Labor law"];

export function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizeSearchProfile(profile: SearchProfile): SearchProfile {
  return {
    ...profile,
    role: normalizeSearchText(profile.role),
    filterRole: normalizeSearchText(profile.filterRole),
    location: normalizeSearchText(profile.location),
    country: normalizeSearchText(profile.country),
    radius: normalizeSearchText(profile.radius),
    skills: profile.skills.split(",").map(normalizeSearchText).filter(Boolean).join(", "),
    skillsMode: profile.skillsMode === "required" ? "required" : "preference",
    seniority: normalizeSearchText(profile.seniority),
    workModel: normalizeSearchText(profile.workModel),
    employmentType: normalizeSearchText(profile.employmentType),
    datePosted: normalizeSearchText(profile.datePosted),
    industry: normalizeSearchText(profile.industry),
    exclude: profile.exclude.split(",").map(normalizeSearchText).filter(Boolean).join(", "),
  };
}

export function normalizedSearchProfile(profile: SearchProfile) {
  const clean = sanitizeSearchProfile(profile);
  const city = clean.location;
  const location = [city, clean.country].filter(Boolean).join(", ");
  return { ...clean, location, city };
}

export function migrateSearchProfile(stored: Partial<SearchProfile>): SearchProfile {
  const merged = { ...emptySearchProfile, ...stored };
  const role = normalizeSearchText(merged.role);
  return sanitizeSearchProfile({
    ...merged,
    filterRole: merged.filterRole || role,
  });
}

export function changeSearchRole(profile: SearchProfile, role: string): SearchProfile {
  return { ...profile, role, filterRole: profile.filterRole || profile.role || role };
}

export function searchPreferencesNeedReview(profile: SearchProfile) {
  return Boolean(profile.skills || profile.seniority || profile.industry || profile.exclude)
    && normalizeSearchText(profile.role).toLocaleLowerCase() !== normalizeSearchText(profile.filterRole).toLocaleLowerCase();
}

export function linkedInDistanceFromKilometers(radius: string) {
  const kilometers = Number(radius);
  if (!Number.isFinite(kilometers) || kilometers <= 0) return "";
  return String(Math.max(1, Math.round(kilometers / 1.609344)));
}

export function linkedInRoleTerms(role: string) {
  const cleanRole = normalizeSearchText(role).replace(/["“”]/g, "");
  const normalizedRole = cleanRole.toLocaleLowerCase();
  const terms = [cleanRole];

  if (/\b(senior\s+)?hr\s*business\s+partner\b|\b(senior\s+)?hrbp\b|\b(senior\s+)?human\s+resources\s+business\s+partner\b/.test(normalizedRole)) {
    const senior = /\bsenior\b/.test(normalizedRole);
    terms.push(
      senior ? "Senior HRBP" : "HRBP",
      senior ? "Senior Human Resources Business Partner" : "Human Resources Business Partner",
    );
  }

  return Array.from(new Set(terms.filter(Boolean)));
}

export function linkedInKeywordQuery(profile: SearchProfile) {
  const quote = (value: string) => `"${value.replace(/["“”]/g, "").trim()}"`;
  const roleTerms = linkedInRoleTerms(profile.role);
  const roleQuery = roleTerms.length > 1
    ? `(${roleTerms.map(quote).join(" OR ")})`
    : quote(roleTerms[0] || profile.role);
  const userExclusions = profile.exclude
    .split(",")
    .map((term) => normalizeSearchText(term).replace(/^-+/, ""))
    .filter(Boolean);
  const exclusions = Array.from(new Set(userExclusions));
  const skills = profile.skillsMode === "required" ? profile.skills.split(",").map(normalizeSearchText).filter(Boolean) : [];
  return [roleQuery, ...skills.map((term) => `AND ${quote(term)}`), ...exclusions.map((term) => `NOT ${quote(term)}`)].join(" ");
}

export function nextSearchDateWindow(datePosted: string) {
  if (datePosted === "Past 24 hours") return "Past week";
  if (datePosted === "Past week") return "Past month";
  if (datePosted === "Past month") return "Any time";
  return datePosted;
}

export function skillSuggestionsForRole(role: string) {
  const normalizedRole = normalizeSearchText(role).toLocaleLowerCase();
  if (/software|developer|programmer|full.?stack|תוכנה|מתכנת|מפתח/.test(normalizedRole)) return ["JavaScript", "TypeScript", "Python", "React", "SQL", "Git", "Testing", "Cloud"];
  if (/data analyst|data analytics|אנליסט|מנתח.*נתונים/.test(normalizedRole)) return ["SQL", "Excel", "Python", "Power BI", "Tableau", "Statistics", "Data visualization"];
  if (/\bnurs(e|ing)\b|registered nurse|אח מוסמך|אחות|סיעוד/.test(normalizedRole)) return ["Patient care", "Clinical assessment", "Medication administration", "BLS", "Infection prevention", "Patient education"];
  if (/teacher|educator|teaching|מורה|הוראה|מחנכ/.test(normalizedRole)) return ["Lesson planning", "Classroom management", "Student assessment", "Differentiated instruction", "Learning technology"];
  if (/store manager|retail manager|מנהל.*חנות|מנהלת.*חנות/.test(normalizedRole)) return ["Store operations", "Team leadership", "Inventory management", "Customer service", "Merchandising", "Sales planning"];
  if (/graphic|visual designer|מעצב.*גרפי|מעצבת.*גרפי|עיצוב גרפי/.test(normalizedRole)) return ["Adobe Illustrator", "Photoshop", "InDesign", "Typography", "Brand identity", "Figma", "Print production"];
  if (/accountant|accounting|רואה חשבון|רואת חשבון|חשבונאות|מנהל.*חשבונות/.test(normalizedRole)) return ["Financial reporting", "Reconciliation", "Excel", "IFRS", "Tax", "Bookkeeping", "ERP"];
  if (/electrician|electrical technician|חשמלאי|חשמלאית/.test(normalizedRole)) return ["Electrical installation", "Troubleshooting", "Electrical safety", "Wiring diagrams", "Preventive maintenance", "Control panels"];
  if (/supply chain|procurement|logistics|inventory|warehouse|operations|שרשרת אספקה|רכש|לוגיסטיקה/.test(normalizedRole)) return supplyChainSkillSuggestions;
  if (/\bhr\b|hrbp|human resources|people|talent|employee|organizational|משאבי אנוש|גיוס|אנשים/.test(normalizedRole)) return hrSkillSuggestions;
  return [];
}

export function searchProfileChanged(current: SearchProfile, submitted: SearchProfile) {
  return JSON.stringify(sanitizeSearchProfile(current)) !== JSON.stringify(sanitizeSearchProfile(submitted));
}

export function broadenSearchProfile(profile: SearchProfile): SearchProfile {
  return sanitizeSearchProfile({ ...profile, ...(profile.datePosted !== "Any time" ? { datePosted: nextSearchDateWindow(profile.datePosted) } : Number(profile.radius) < 50 ? { radius: "50" } : profile.seniority ? { seniority: "" } : {}) });
}

export function patchSearchProfile(current: SearchProfile, patch: Partial<SearchProfile>): SearchProfile {
  return { ...current, ...patch, ...(patch.country !== undefined && patch.country !== current.country ? { location: "" } : {}) };
}

export function captureJobLink(value: string) {
  const url = new URL(value.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("Unsupported URL");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const linkedIn = host === "linkedin.com" || host.endsWith(".linkedin.com");
  const indeed = /(^|\.)indeed\.[a-z.]+$/.test(host);
  return { jobUrl: url.toString(), source: linkedIn ? "LinkedIn" : indeed ? "Indeed" : "Other", company: "", role: "" };
}

export function localizedSearchFilter(value: string, language: Language) {
  if (language === "en") return value;
  return ({
    "Past 24 hours": "24 השעות האחרונות",
    "Past week": "השבוע האחרון",
    "Past month": "החודש האחרון",
    "Any time": "ללא הגבלת זמן",
    "Full-time": "משרה מלאה",
    "Part-time": "משרה חלקית",
    Contract: "חוזה",
    Temporary: "זמני",
    Internship: "התמחות",
    "Entry level": "דרגת כניסה",
    Associate: "עמית/ה",
    "Mid-Senior level": "דרגת ביניים–בכיר/ה",
    Director: "דירקטור/ית",
    Executive: "הנהלה בכירה",
    Remote: "מרחוק",
    Hybrid: "היברידי",
    "On-site": "באתר",
  } as Record<string, string>)[value] || value;
}

export function companyJobSearchRoute(profile: SearchProfile, company: string, routeIndex = 0, officialCareerUrl = "") {
  const clean = normalizedSearchProfile(profile);
  const freshness = clean.datePosted === "Past 24 hours" ? "r86400" : clean.datePosted === "Past week" ? "r604800" : clean.datePosted === "Past month" ? "r2592000" : "";
  const indeedDomains: Record<string, string> = { Netherlands: "nl.indeed.com", Israel: "il.indeed.com", "United Kingdom": "uk.indeed.com", Germany: "de.indeed.com", France: "fr.indeed.com", Spain: "es.indeed.com", Portugal: "pt.indeed.com", Belgium: "be.indeed.com", Canada: "ca.indeed.com", "United States": "www.indeed.com" };
  const googleDomains: Record<string, string> = { Netherlands: "www.google.nl", Israel: "www.google.co.il", "United Kingdom": "www.google.co.uk", Germany: "www.google.de", France: "www.google.fr", Spain: "www.google.es", Portugal: "www.google.pt", Belgium: "www.google.be", Canada: "www.google.ca", "United States": "www.google.com" };
  const indeedAge = clean.datePosted === "Past 24 hours" ? "1" : clean.datePosted === "Past week" ? "7" : clean.datePosted === "Past month" ? "30" : "";
  const provider = routeIndex % 3;

  if (provider === 0) {
    const query = encodeURIComponent(`"${clean.role}" "${company}"`);
    const location = encodeURIComponent(clean.location);
    return {
      provider: `Indeed · ${company}`,
      url: `https://${indeedDomains[clean.country] || "www.indeed.com"}/jobs?q=${query}&l=${location}&radius=${encodeURIComponent(clean.radius)}${indeedAge ? `&fromage=${indeedAge}` : ""}&sort=date`,
    };
  }

  if (provider === 1) {
    const officialDomain = officialCareerUrl ? new URL(officialCareerUrl).hostname : "";
    const siteFilter = officialDomain ? `site:${officialDomain}` : "";
    const query = [siteFilter, `"${clean.role}"`, `"${company}"`, clean.city ? `"${clean.city}"` : "", `"${clean.country}"`, "jobs"].filter(Boolean).join(" ");
    return {
      provider: officialDomain ? `Official-site results · ${company}` : `Web results · ${company}`,
      url: `https://${googleDomains[clean.country] || "www.google.com"}/search?q=${encodeURIComponent(query)}`,
    };
  }

  const params = new URLSearchParams({
    keywords: `"${clean.role}" "${company}"`,
    location: clean.location,
    distance: linkedInDistanceFromKilometers(clean.radius),
    sortBy: "DD",
  });
  if (freshness) params.set("f_TPR", freshness);
  return {
    provider: `LinkedIn · ${company}`,
    url: `https://www.linkedin.com/jobs/search/?${params.toString()}`,
  };
}

export function searchFilterSummary(profile: SearchProfile, source: "linkedin" | "indeed" | "google", language: Language) {
  const he = language === "he";
  const applied: string[] = [];
  const notApplied: string[] = [];
  const add = (name: string, value: string, supported = true) => { if (value) (supported ? applied : notApplied).push(`${name}: ${value}`); };
  add(he ? "ביטוי תפקיד (כולל חלופות מוצגות בשאילתה)" : "Role phrase (aliases shown in query)", profile.role);
  add(he ? "מיקום מבוקש" : "Requested location", [profile.location, profile.country].filter(Boolean).join(", "));
  add(he ? "רדיוס" : "Radius", `${profile.radius} km`, source !== "google");
  add(he ? "מועד פרסום" : "Date posted", localizedSearchFilter(profile.datePosted, language), ["Past 24 hours", "Past week", "Past month", "Any time"].includes(profile.datePosted));
  add(he ? "סוג העסקה" : "Employment type", localizedSearchFilter(profile.employmentType, language), source !== "google" && ["Full-time", "Part-time", "Contract", "Temporary", "Internship"].includes(profile.employmentType));
  add(he ? "דרגה" : "Seniority", localizedSearchFilter(profile.seniority, language), source === "linkedin" && ["Entry level", "Associate", "Mid-Senior level", "Director", "Executive"].includes(profile.seniority));
  add(source === "linkedin" ? (he ? "מודל עבודה" : "Work model") : (he ? "מודל עבודה כמילת חיפוש" : "Work model as a keyword"), localizedSearchFilter(profile.workModel, language), ["Remote", "Hybrid", "On-site"].includes(profile.workModel));
  add(source === "google" ? (he ? "תחום כמילת חיפוש בלבד" : "Industry as a keyword only") : (he ? "תחום" : "Industry"), profile.industry, source === "google");
  add(profile.skillsMode === "required" ? (he ? "כישורים נדרשים במילות החיפוש" : "Required skills in keywords") : (he ? "כישורים להעדפה בלבד — לא מסוננים" : "Preferred skills — not filtered"), profile.skills, profile.skillsMode === "required");
  add(he ? "מילות החרגה" : "Exclusions", profile.exclude);
  return { applied, notApplied };
}

export function jobSearchSources(profile: SearchProfile, language: Language = "en"): JobSearchSource[] {
  const clean = normalizedSearchProfile(profile);
  const indeedDomains: Record<string, string> = { Netherlands: "nl.indeed.com", Israel: "il.indeed.com", "United Kingdom": "uk.indeed.com", Germany: "de.indeed.com", France: "fr.indeed.com", Spain: "es.indeed.com", Portugal: "pt.indeed.com", Belgium: "be.indeed.com", Canada: "ca.indeed.com", "United States": "www.indeed.com" };
  const googleDomains: Record<string, string> = { Netherlands: "www.google.nl", Israel: "www.google.co.il", "United Kingdom": "www.google.co.uk", Germany: "www.google.de", France: "www.google.fr", Spain: "www.google.es", Portugal: "www.google.pt", Belgium: "www.google.be", Canada: "www.google.ca", "United States": "www.google.com" };
  const countryCodes: Record<string, string> = { Netherlands: "nl", Israel: "il", "United Kingdom": "gb", Germany: "de", France: "fr", Spain: "es", Portugal: "pt", Belgium: "be", Canada: "ca", "United States": "us" };
  const indeedDomain = indeedDomains[clean.country] || "www.indeed.com";
  const googleDomain = googleDomains[clean.country] || "www.google.com";
  const quote = (value: string) => `"${value.replace(/["“”]/g, "").trim()}"`;
  const skills = clean.skillsMode === "required" ? clean.skills.split(",").map(normalizeSearchText).filter(Boolean) : [];
  const exclusions = clean.exclude.split(",").map((term) => normalizeSearchText(term).replace(/^-+/, "")).filter(Boolean);
  const supplement = skills.map(quote);
  const negative = exclusions.map((term) => `-${quote(term)}`);
  const exactRole = `intitle:${quote(clean.role)}`;
  const indeedQuery = [quote(clean.role), ...supplement.map((term) => `AND ${term}`), ...negative, clean.workModel ? `AND ${quote(clean.workModel)}` : ""].filter(Boolean).join(" ");
  const googleQuery = [exactRole, "jobs", clean.city ? quote(clean.city) : "", quote(clean.country), ...supplement, clean.industry ? quote(clean.industry) : "", clean.workModel ? quote(clean.workModel) : "", ...negative].filter(Boolean).join(" ");
  const indeedAge = clean.datePosted === "Past 24 hours" ? "1" : clean.datePosted === "Past week" ? "7" : clean.datePosted === "Past month" ? "30" : "";
  const linkedInAge = clean.datePosted === "Past 24 hours" ? "r86400" : clean.datePosted === "Past week" ? "r604800" : clean.datePosted === "Past month" ? "r2592000" : "";
  const googleAge = clean.datePosted === "Past 24 hours" ? "qdr:d" : clean.datePosted === "Past week" ? "qdr:w" : clean.datePosted === "Past month" ? "qdr:m" : "";
  const countryCode = countryCodes[clean.country] || clean.country.slice(0, 2).toLowerCase();
  const linkedInQuery = linkedInKeywordQuery(clean);
  const linkedInParams = new URLSearchParams({ keywords: linkedInQuery, location: clean.location, distance: linkedInDistanceFromKilometers(clean.radius), sortBy: "DD", origin: "JOB_SEARCH_PAGE_JOB_FILTER" });
  if (linkedInAge) linkedInParams.set("f_TPR", linkedInAge);
  const linkedInSeniority: Record<string, string> = { "Entry level": "2", Associate: "3", "Mid-Senior level": "4", Director: "5", Executive: "6" };
  const linkedInEmployment: Record<string, string> = { "Full-time": "F", "Part-time": "P", Contract: "C", Temporary: "T", Internship: "I" };
  const linkedInWorkModel: Record<string, string> = { "On-site": "1", Remote: "2", Hybrid: "3" };
  if (linkedInSeniority[clean.seniority]) linkedInParams.set("f_E", linkedInSeniority[clean.seniority]);
  if (linkedInEmployment[clean.employmentType]) linkedInParams.set("f_JT", linkedInEmployment[clean.employmentType]);
  if (linkedInWorkModel[clean.workModel]) linkedInParams.set("f_WT", linkedInWorkModel[clean.workModel]);
  const indeedEmployment: Record<string, string> = { "Full-time": "fulltime", "Part-time": "parttime", Contract: "contract", Temporary: "temporary", Internship: "internship" };
  const indeedParams = new URLSearchParams({ q: indeedQuery, l: clean.location, radius: clean.radius, sort: "date" });
  if (indeedAge) indeedParams.set("fromage", indeedAge);
  if (indeedEmployment[clean.employmentType]) indeedParams.set("jt", indeedEmployment[clean.employmentType]);
  const googleParams = new URLSearchParams({ q: googleQuery, hl: language === "he" ? "he" : "en", gl: countryCode });
  if (googleAge) googleParams.set("tbs", googleAge);
  const freshnessLabel = language === "he"
    ? ({ "Past 24 hours": "24 השעות האחרונות", "Past week": "השבוע האחרון", "Past month": "החודש האחרון", "Any time": "ללא הגבלת זמן" }[clean.datePosted] || clean.datePosted)
    : clean.datePosted;
  const sentSummary = `${quote(clean.role)} · ${clean.location || clean.country} · ${freshnessLabel}`;
  return [
    { name: "LinkedIn", emoji: "in", featured: true, freshness: freshnessLabel, accuracy: sentSummary, query: linkedInQuery, description: language === "he" ? "הקישור שולח את ביטוי התפקיד, המיקום והמסננים המפורטים כאן. LinkedIn עשוי להציג המלצות או להרחיב התאמות; בדקו את התפקיד והמיקום בכל מודעה." : "The link sends the role phrase, location and filters listed here. LinkedIn may show recommendations or broader matches; check the role and location in each listing.", url: `https://www.linkedin.com/jobs/search/?${linkedInParams.toString()}`, ...searchFilterSummary({ ...clean, location: clean.city }, "linkedin", language) },
    { name: language === "he" ? "Indeed — חיפוש מקומי" : "Indeed — local search", emoji: "🌍", featured: false, freshness: freshnessLabel, accuracy: sentSummary, query: indeedQuery, description: language === "he" ? "קישור לחיפוש ב־Indeed. יש לבדוק את המסננים והתוצאות במקור." : "A search link to Indeed. Review its filters and results at the source.", url: `https://${indeedDomain}/jobs?${indeedParams.toString()}`, ...searchFilterSummary({ ...clean, location: clean.city }, "indeed", language) },
    { name: language === "he" ? "Google — חיפוש ממוקד משרות" : "Google — jobs-focused search", emoji: "🔎", featured: false, freshness: freshnessLabel, accuracy: sentSummary, query: googleQuery, description: language === "he" ? "מילות חיפוש למשרות, לא מאגר תוצאות מאומתות." : "A web query for jobs, not a verified listing feed.", url: `https://${googleDomain}/search?${googleParams.toString()}`, ...searchFilterSummary({ ...clean, location: clean.city }, "google", language) },
  ];
}
