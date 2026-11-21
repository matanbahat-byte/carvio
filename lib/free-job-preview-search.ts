// Deterministic preview relevance rules; never infer remote-work eligibility.
import type { PublicJob } from "./free-job-sources.ts";
const aliases: Record<string, string[]> = {
  "hr business partner": ["hrbp", "people partner", "human resources business partner", "people business partner"],
  "supply chain manager": ["supply chain lead", "supply chain director", "head of supply chain", "supply chain planning manager"],
  "supply chain director": ["director of supply chain", "head of supply chain", "global supply chain director", "director, supply chain"],
  "director of supply chain": ["supply chain director", "head of supply chain", "global supply chain director"],
  "head of supply chain": ["supply chain director", "director of supply chain", "global supply chain director"],
  "מנהל שרשרת אספקה בכיר": ["supply chain director", "director of supply chain", "head of supply chain"],
  "software engineer": ["software developer", "backend engineer", "frontend engineer", "full stack engineer", "full-stack engineer"],
  "מהנדס תוכנה": ["software engineer", "software developer", "backend engineer", "frontend engineer", "full stack engineer", "full-stack engineer"],
  "מפתח תוכנה": ["software engineer", "software developer", "backend developer", "frontend developer", "full stack developer", "full-stack developer"],
  "מפתחת תוכנה": ["software engineer", "software developer", "backend developer", "frontend developer", "full stack developer", "full-stack developer"],
  "מנהל מוצר": ["product manager", "product lead", "head of product"],
  "מנהלת מוצר": ["product manager", "product lead", "head of product"],
  "מהנדסת תוכנה": ["software engineer", "software developer", "backend engineer", "frontend engineer", "full stack engineer", "full-stack engineer"],
  "פיתוח תוכנה": ["software engineer", "software developer", "backend engineer", "frontend engineer", "full stack engineer", "full-stack engineer"],
  "מנהל שרשרת אספקה": ["supply chain manager", "supply chain lead", "supply chain director", "head of supply chain"],
  "מנהלת שרשרת אספקה": ["supply chain manager", "supply chain lead", "supply chain director", "head of supply chain"],
  "שותף עסקי משאבי אנוש": ["hr business partner", "hrbp", "people partner", "people business partner"],
  "שותפה עסקית משאבי אנוש": ["hr business partner", "hrbp", "people partner", "people business partner"],
  "software engineering": ["software engineer", "software developer", "backend engineer", "frontend engineer", "full stack engineer", "full-stack engineer"],
};
const israelPlaces = /\b(israel|tel[ -]?aviv|herzliya|haifa|jerusalem|petah[ -]?tikva|ramat[ -]?gan|raanana|rishon[ -]?lezion|netanya|beer[ -]?sheva|bnei[ -]?brak|hod[ -]?hasharon|kfar[ -]?saba|yokneam|rehovot)\b/i;
// ATS boards frequently list only a city. Keep these mappings explicit and
// conservative: never infer a country from a generic "Remote" label.
const countryPlaces: Record<string, RegExp> = {
  netherlands: /\b(netherlands|the netherlands|amsterdam|rotterdam|utrecht|eindhoven|the hague|den haag|haarlem|amstelveen|delft|leiden|groningen)\b/i,
  germany: /\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|düsseldorf|dusseldorf|cologne|köln|stuttgart|bonn|dortmund|leipzig)\b/i,
};
const countryAliases: Record<string, string> = {
  "הולנד": "netherlands", "נידרלנד": "netherlands", "נדרלנד": "netherlands",
  "גרמניה": "germany",
};
export function titleMatches(title: string, query: string): boolean {
  const needle = query.toLocaleLowerCase().trim();
  if (!needle) return true;
  const haystack = title.toLocaleLowerCase();
  return haystack.includes(needle) || (aliases[needle] ?? []).some(alias => haystack.includes(alias));
}
const hebrewCities: Record<string, string[]> = {
  "תל אביב": ["tel aviv", "tel-aviv"], "ירושלים": ["jerusalem"], "חיפה": ["haifa"],
  "הרצליה": ["herzliya", "herzliyya"], "רמת גן": ["ramat gan"],
  "פתח תקווה": ["petah tikva", "petach tikva"], "בני ברק": ["bnei brak"],
  "נתניה": ["netanya"], "רחובות": ["rehovot"], "ראשון לציון": ["rishon lezion", "rishon le zion"],
  "באר שבע": ["beer sheva", "beersheba"], "כפר סבא": ["kfar saba"],
};
export function locationMatches(actual: string, requested: string): boolean {
  const needle = requested.toLocaleLowerCase().trim();
  if (!needle) return true;
  if (needle === "israel" || needle === "ישראל") {
    if (/\b(?:united states|usa|u\.s\.a\.|uk|united kingdom|germany|netherlands|canada|australia|france|spain|poland)\b/i.test(actual)) return false;
    if (/ישראל/.test(actual)) return true;
    // Hebrew-only city names on ATS boards are also valid Israeli locations.
    if (/(?:תל[ -]?אביב|ירושלים|חיפה|הרצליה|רמת[ -]?גן|פתח[ -]?תקווה|בני[ -]?ברק|נתניה|רחובות|ראשון[ -]?לציון|באר[ -]?שבע|כפר[ -]?סבא)/.test(actual)) return true;
    // A city match alone cannot override an explicitly different country.
    // Employer boards sometimes publish city names shared by multiple countries.
    return israelPlaces.test(actual);
  }
  const countryPattern = countryPlaces[countryAliases[needle] ?? needle];
  if (countryPattern) {
    // A matching city must not override an explicitly different country.
    const foreignCountry = /\b(?:israel|united states|usa|u\.s\.a\.|uk|united kingdom|germany|deutschland|netherlands|canada|australia|france|spain|poland)\b/gi;
    const target = countryAliases[needle] ?? needle;
    const namedCountries = [...actual.matchAll(foreignCountry)].map(match => match[0].toLocaleLowerCase());
    const targetNames = target === "germany" ? ["germany", "deutschland"] : ["netherlands", "the netherlands"];
    if (namedCountries.some(name => !targetNames.includes(name))) return false;
    return countryPattern.test(actual);
  }
  const variants = hebrewCities[needle];
  return variants ? (actual.includes(needle) || variants.some(v => actual.toLocaleLowerCase().includes(v))) : actual.toLocaleLowerCase().includes(needle);
}
export function searchPreviewJobs(jobs: PublicJob[], options: {query?:string;location?:string;country?:string;city?:string;age?: "90"|"180"|"all";now?:number}): PublicJob[] {
  const query=(options.query ?? "").trim().slice(0,80);
  const location=(options.location ?? "").trim().slice(0,80);
  const country=(options.country ?? "").trim().slice(0,80);
  const city=(options.city ?? "").trim().slice(0,80);
  const age=options.age ?? "180";
  const now=options.now ?? Date.now();
  const cutoff=now - Number(age === "all" ? 0 : age)*86_400_000;
  return jobs.filter(job=>{
    // Known role queries must match a job title, never merely an employer or city.
    const titleMatch = query ? titleMatches(job.title,query) : true;
    // The search box asks for a role: employer/location-only matches are misleading.
    if (query && !titleMatch) return false;
    if (!locationMatches(job.location,location)) return false;
    if (!locationMatches(job.location,country)) return false;
    if (city && !locationMatches(job.location,city)) return false;
    if (age !== "all") {
      const published=job.postedAt ? Date.parse(job.postedAt) : NaN;
      // Missing publication date is not proof that a live ATS posting is old.
      // Keep undated postings, label their date as unknown in the UI, and rank them last.
      if (Number.isFinite(published) && (published < cutoff || published > now+86_400_000)) return false;
    }
    return true;
  }).sort((a,b)=>{
    const relevance=(job:PublicJob)=>!query?0:job.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())?2:1;
    return relevance(b)-relevance(a) || (Date.parse(b.postedAt ?? "") || 0)-(Date.parse(a.postedAt ?? "") || 0);
  });
}
