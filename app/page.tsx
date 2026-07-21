"use client";

import { FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarPlus,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Copy,
  Clock3,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  HeartHandshake,
  Lightbulb,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircleMore,
  MessagesSquare,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users2,
  X,
  Zap,
  WandSparkles,
} from "lucide-react";

const APPLICATIONS_KEY = "carvio.applications.v1";
const CONTACTS_KEY = "carvio.contacts.v1";
const FEEDBACK_KEY = "carvio.feedback.v1";
const RESUMES_KEY = "carvio.resumes.v1";
const SEARCH_PROFILE_KEY = "carvio.search-profile.v1";
const RECOVERY_KEY = "carvio.recovery.v1";

const applicationStatuses = [
  "Applied",
  "Interview",
  "Offer",
  "Follow-up due",
  "Rejected",
  "Withdrawn",
] as const;

type ApplicationStatus = (typeof applicationStatuses)[number];

const trafficLights = ["none", "green", "yellow", "red"] as const;
type TrafficLight = (typeof trafficLights)[number];

const workModels = ["", "Remote", "Hybrid", "On-site"] as const;
const priorities = ["Low", "Medium", "High"] as const;

type Application = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  trafficLight: TrafficLight;
  source: string;
  location: string;
  workModel: (typeof workModels)[number];
  priority: (typeof priorities)[number];
  appliedDate: string;
  contactName: string;
  jobUrl: string;
  salary: string;
  salaryCurrency: "ILS" | "USD" | "EUR" | "GBP" | "Other";
  nextStep: string;
  nextStepDue: string;
  eventType: string;
  eventDateTime: string;
  notes: string;
};

type Contact = {
  id: string;
  name: string;
  company: string;
  role: string;
  relationship: string;
  trafficLight: TrafficLight;
  email: string;
  phone: string;
  linkedInUrl: string;
  lastContactDate: string;
  nextAction: string;
  nextActionDue: string;
  eventType: string;
  eventDateTime: string;
  notes: string;
};

type Feedback = {
  id: string;
  answers: { question: string; score: number; comment: string }[];
  openFeedback: string;
  submittedAt: string;
};

type ResumeFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  extractedText: string;
};

type SearchProfile = {
  role: string;
  location: string;
  country: string;
  radius: string;
  skills: string;
  seniority: string;
  workModel: string;
  employmentType: string;
  datePosted: string;
  industry: string;
  exclude: string;
};

type MessageProfile = {
  recipientType: "Recruiter" | "Hiring manager" | "Referral" | "Networking contact";
  tone: "Warm & professional" | "Direct & confident" | "Friendly & concise" | "Senior & strategic";
  intent: "Introduce myself" | "Ask for a referral" | "Follow up after applying" | "Request a conversation" | "Thank them";
  recipientName: string;
  recipientEmail: string;
  company: string;
  role: string;
  senderName: string;
  value: string;
  context: string;
};

type RecoveryNeed = "I need a moment" | "Help me learn" | "Help me close the loop" | "Help me move forward";

type RecoveryEntry = {
  id: string;
  applicationId: string;
  company: string;
  role: string;
  need: RecoveryNeed;
  whatWorked: string;
  learning: string;
  outsideControl: string;
  nextAction: string;
  completedAt: string;
};

type ApplicationDraft = Omit<Application, "id">;
type ContactDraft = Omit<Contact, "id">;

const emptySearchProfile: SearchProfile = { role: "", location: "", country: "Netherlands", radius: "25", skills: "", seniority: "", workModel: "", employmentType: "Full-time", datePosted: "Past week", industry: "", exclude: "" };

const skillSuggestions = ["Business partnering", "Talent management", "Employee relations", "Organizational development", "Change management", "Workforce planning", "Coaching", "HR analytics", "People strategy", "Recruitment", "Compensation & benefits", "Labor law", "Stakeholder management", "Leadership development", "Performance management"];
const roleSuggestions = ["HR Business Partner", "Senior HR Business Partner", "People Partner", "HR Manager", "People Operations Manager", "Talent Acquisition Partner", "Organizational Development Manager", "Employee Experience Manager"];
const countryOptions = ["Netherlands", "Israel", "United Kingdom", "Germany", "France", "Spain", "Portugal", "Belgium", "United States", "Canada", "Other"];
const pilotQuestions = [
  "How easy was it to understand what Carvio does?",
  "How easy was it to add and manage applications?",
  "How useful was the Networking area?",
  "How valuable was Precision Job Search?",
  "How useful were the insights and recommendations?",
  "How helpful did Message Studio feel?",
  "How supportive and appropriate was Carvio Reset?",
  "How likely are you to use Carvio again next week?",
];
const citySuggestions: Record<string, string[]> = {
  Netherlands: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Haarlem", "Leiden"],
  Israel: ["Tel Aviv", "Herzliya", "Ramat Gan", "Haifa", "Jerusalem", "Petah Tikva", "Ra'anana"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol"],
  Germany: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
  France: ["Paris", "Lyon", "Marseille", "Toulouse"],
  Spain: ["Madrid", "Barcelona", "Valencia", "Malaga"],
  Portugal: ["Lisbon", "Porto", "Braga"],
  Belgium: ["Brussels", "Antwerp", "Ghent"],
  "United States": ["New York", "San Francisco", "Los Angeles", "Chicago", "Boston", "Austin", "Seattle"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary"],
};
const emptyMessageProfile: MessageProfile = { recipientType: "Recruiter", tone: "Warm & professional", intent: "Introduce myself", recipientName: "", recipientEmail: "", company: "", role: "", senderName: "", value: "", context: "" };

const statusStyles: Record<ApplicationStatus, string> = {
  Applied: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  Interview: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  Offer: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  "Follow-up due": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  Rejected: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  Withdrawn: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

const emptyApplication: ApplicationDraft = {
  company: "",
  role: "",
  status: "Applied",
  trafficLight: "none",
  source: "",
  location: "",
  workModel: "",
  priority: "Medium",
  appliedDate: "",
  contactName: "",
  jobUrl: "",
  salary: "",
  salaryCurrency: "ILS",
  nextStep: "",
  nextStepDue: "",
  eventType: "Interview",
  eventDateTime: "",
  notes: "",
};

const emptyContact: ContactDraft = {
  name: "",
  company: "",
  role: "",
  relationship: "",
  trafficLight: "none",
  email: "",
  phone: "",
  linkedInUrl: "",
  lastContactDate: "",
  nextAction: "",
  nextActionDue: "",
  eventType: "Networking meeting",
  eventDateTime: "",
  notes: "",
};

const demoApplications: Application[] = [
  {
    id: "demo-app-1",
    company: "Northstar Labs",
    role: "Senior Product Designer",
    status: "Interview",
    trafficLight: "green",
    source: "Referral",
    location: "London",
    workModel: "Hybrid",
    priority: "High",
    appliedDate: "2026-07-10",
    contactName: "Mina Chen",
    jobUrl: "",
    salary: "",
    salaryCurrency: "GBP",
    nextStep: "Prepare two portfolio stories",
    nextStepDue: "2026-07-24",
    eventType: "Second interview",
    eventDateTime: "2026-07-25T10:00",
    notes: "Interview with the product design lead.",
  },
  {
    id: "demo-app-2",
    company: "Lumen Studio",
    role: "Product Designer",
    status: "Applied",
    trafficLight: "yellow",
    source: "Company website",
    location: "Remote",
    workModel: "Remote",
    priority: "Medium",
    appliedDate: "2026-07-15",
    contactName: "",
    jobUrl: "",
    salary: "",
    salaryCurrency: "EUR",
    nextStep: "Check for a response next week",
    nextStepDue: "2026-07-26",
    eventType: "Recruiter call",
    eventDateTime: "",
    notes: "Applied through the company careers page.",
  },
  {
    id: "demo-app-3",
    company: "Orbit Health",
    role: "Senior UX Researcher",
    status: "Follow-up due",
    trafficLight: "red",
    source: "LinkedIn",
    location: "Berlin",
    workModel: "Remote",
    priority: "High",
    appliedDate: "2026-07-04",
    contactName: "",
    jobUrl: "",
    salary: "",
    salaryCurrency: "EUR",
    nextStep: "Send portfolio follow-up",
    nextStepDue: "2026-07-18",
    eventType: "Recruiter call",
    eventDateTime: "",
    notes: "Recruiter requested two relevant case studies.",
  },
];

const demoContacts: Contact[] = [
  {
    id: "demo-contact-1",
    name: "Mina Chen",
    company: "Northstar Labs",
    role: "VP Design",
    relationship: "Former colleague",
    trafficLight: "green",
    email: "",
    phone: "",
    linkedInUrl: "",
    lastContactDate: "2026-07-16",
    nextAction: "Ask about the design team",
    nextActionDue: "2026-07-23",
    eventType: "Coffee chat",
    eventDateTime: "2026-07-24T14:00",
    notes: "Available for a short chat this week.",
  },
  {
    id: "demo-contact-2",
    name: "Ari Malik",
    company: "Lumen Studio",
    role: "Principal Engineer",
    relationship: "Second-degree connection",
    trafficLight: "yellow",
    email: "",
    phone: "",
    linkedInUrl: "",
    lastContactDate: "2026-07-12",
    nextAction: "Thank Ari for the introduction",
    nextActionDue: "2026-07-22",
    eventType: "Networking call",
    eventDateTime: "",
    notes: "Connected through a former teammate.",
  },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeApplication(value: Partial<Application>): Application {
  return {
    ...emptyApplication,
    ...value,
    id: value.id || makeId("app"),
    status: applicationStatuses.includes(value.status as ApplicationStatus) ? value.status as ApplicationStatus : "Applied",
    trafficLight: trafficLights.includes(value.trafficLight as TrafficLight) ? value.trafficLight as TrafficLight : "none",
  };
}

function normalizeContact(value: Partial<Contact> & { companyRole?: string }): Contact {
  const legacyParts = value.companyRole?.split(" at ") || [];
  return {
    ...emptyContact,
    ...value,
    id: value.id || makeId("contact"),
    company: value.company || legacyParts[1] || "",
    role: value.role || legacyParts[0] || value.companyRole || "",
    trafficLight: trafficLights.includes(value.trafficLight as TrafficLight) ? value.trafficLight as TrafficLight : "none",
  };
}

function isPast(dateValue: string) {
  if (!dateValue) return false;
  const endOfDay = new Date(`${dateValue}T23:59:59`);
  return endOfDay.getTime() < Date.now();
}

function formatDate(value: string, includeTime = false) {
  if (!value) return "";
  const date = new Date(includeTime ? value : `${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function calendarDates(value: string) {
  const start = new Date(value);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const compact = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { start, end, google: `${compact(start)}/${compact(end)}`, icsStart: compact(start), icsEnd: compact(end) };
}

function escapeICS(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function openGoogleCalendar(title: string, dateTime: string, details: string, location = "") {
  if (!dateTime) return;
  const dates = calendarDates(dateTime);
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: dates.google, details, location });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank", "noopener,noreferrer");
}

function downloadICS(title: string, dateTime: string, details: string, location = "") {
  if (!dateTime) return;
  const dates = calendarDates(dateTime);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Carvio//Career Calendar//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${makeId("carvio")}@carvio`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${dates.icsStart}`, `DTEND:${dates.icsEnd}`, `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(details)}`, `LOCATION:${escapeICS(location)}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "carvio-event"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function parseSalaryExpectation(value: string) {
  const numbers = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g)?.map(Number).filter((number) => Number.isFinite(number)) || [];
  if (!numbers.length) return null;
  const normalized = numbers.map((number) => /\bk\b/i.test(value) && number < 1000 ? number * 1000 : number);
  return normalized.reduce((sum, number) => sum + number, 0) / normalized.length;
}

function compactMoney(value: number, currency: string) {
  const amount = value >= 1000 ? `${Math.round(value / 100) / 10}k` : `${Math.round(value)}`;
  return `${currency} ${amount}`;
}

function reviewResumeText(text: string) {
  const clean = text.trim();
  if (!clean) return [
    "Paste the CV text below to receive content-specific feedback.",
    "For PDF, DOCX, or image files, the pilot stores the file details locally but does not extract private content yet.",
    "Keep the CV to one or two focused pages and tailor the headline to the target role.",
  ];
  const lower = clean.toLowerCase();
  const bullets = (clean.match(/[•●▪\-*]\s+/g) || []).length;
  const numbers = (clean.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []).length;
  const results = [];
  if (clean.length < 900) results.push("The CV may be too brief. Add evidence, scope, and outcomes to the most relevant roles.");
  if (clean.length > 9000) results.push("The CV is dense. Remove repetition and protect the most relevant achievements for the first page.");
  if (bullets < 5) results.push("Use concise achievement bullets so recruiters can scan impact quickly.");
  if (numbers < 3) results.push("Add measurable outcomes—revenue, time saved, team size, growth, volume, or percentages.");
  if (!/(summary|profile|professional overview)/i.test(clean)) results.push("Add a focused professional summary that names the target role and strongest differentiators.");
  if (!/(skills|expertise|competencies)/i.test(clean)) results.push("Add a compact skills section aligned with the language used in target job descriptions.");
  if (/(responsible for|duties included|helped with)/i.test(lower)) results.push("Replace passive phrases such as “responsible for” with strong action verbs and outcomes.");
  if (results.length < 3) results.push("The structure is promising. Tailor the top third for each target role and move the strongest proof points higher.");
  return results.slice(0, 5);
}

function normalizedSearchProfile(profile: SearchProfile) {
  const roleWithLocation = profile.role.match(/^(.+?)\s+in\s+([^,]+)$/i);
  const role = roleWithLocation && !profile.location.trim() ? roleWithLocation[1].trim() : profile.role.trim();
  const city = roleWithLocation && !profile.location.trim() ? roleWithLocation[2].trim() : profile.location.trim();
  const location = [city, profile.country].filter(Boolean).join(", ");
  return { ...profile, role, location, city };
}

function buildSearchQuery(profile: SearchProfile, includeLocation = true) {
  const clean = normalizedSearchProfile(profile);
  const requiredSkills = clean.skills.split(",").map((item) => item.trim()).filter(Boolean).map((item) => `"${item}"`).join(" ");
  const excluded = clean.exclude.split(",").map((item) => item.trim()).filter(Boolean).map((item) => `-${item.replace(/\s+/g, "-")}`).join(" ");
  return [`"${clean.role}"`, clean.seniority, requiredSkills, clean.industry, clean.employmentType, clean.workModel, includeLocation ? `"${clean.location}"` : "", excluded].filter(Boolean).join(" ");
}

function jobSearchSources(profile: SearchProfile) {
  const clean = normalizedSearchProfile(profile);
  const roleQuery = buildSearchQuery(profile, false);
  const role = encodeURIComponent(roleQuery);
  const location = encodeURIComponent(clean.location);
  const indeedDomains: Record<string, string> = { Netherlands: "nl.indeed.com", Israel: "il.indeed.com", "United Kingdom": "uk.indeed.com", Germany: "de.indeed.com", France: "fr.indeed.com", Spain: "es.indeed.com", Portugal: "pt.indeed.com", Belgium: "be.indeed.com", Canada: "ca.indeed.com", "United States": "www.indeed.com" };
  const linkedInDomains: Record<string, string> = { Netherlands: "nl.linkedin.com", Israel: "il.linkedin.com", "United Kingdom": "uk.linkedin.com", Germany: "de.linkedin.com", France: "fr.linkedin.com", Spain: "es.linkedin.com", Portugal: "pt.linkedin.com", Belgium: "be.linkedin.com", Canada: "ca.linkedin.com", "United States": "www.linkedin.com" };
  const googleDomains: Record<string, string> = { Netherlands: "www.google.nl", Israel: "www.google.co.il", "United Kingdom": "www.google.co.uk", Germany: "www.google.de", France: "www.google.fr", Spain: "www.google.es", Portugal: "www.google.pt", Belgium: "www.google.be", Canada: "www.google.ca", "United States": "www.google.com" };
  const indeedDomain = indeedDomains[clean.country] || "www.indeed.com";
  const linkedInDomain = linkedInDomains[clean.country] || "www.linkedin.com";
  const googleDomain = googleDomains[clean.country] || "www.google.com";
  const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  const linkedInLocalUrl = `https://${linkedInDomain}/jobs/${slug(clean.role)}-jobs-${slug(clean.city)}`;
  const geographicExclusions = ["London", "United Kingdom", "Israel", "Netanya", "South Africa", "United States", "Canada", "Australia"].filter((term) => !clean.location.toLowerCase().includes(term.toLowerCase())).map((term) => `-"${term}"`).join(" ");
  const strictLocalQuery = `"${clean.role}" "${clean.city}" "${clean.country}" ${clean.skills ? clean.skills.split(",").map((skill) => `"${skill.trim()}"`).join(" ") : ""} ${clean.workModel ? `"${clean.workModel}"` : ""} ${geographicExclusions}`;
  const indeedAge = clean.datePosted === "Past 24 hours" ? "1" : clean.datePosted === "Past week" ? "7" : clean.datePosted === "Past month" ? "30" : "";
  return [
    { name: "LinkedIn Local", emoji: "💼", featured: true, accuracy: `Local ${clean.country} page`, description: `Public ${clean.role} listings centered on ${clean.city}, without relying on your account’s saved location`, url: linkedInLocalUrl },
    { name: "Google Local", emoji: "🔎", featured: false, accuracy: "Required city + country", description: `Local Google results requiring both ${clean.city} and ${clean.country}`, url: `https://${googleDomain}/search?q=${encodeURIComponent(`${strictLocalQuery} jobs`)}&hl=en&gl=${encodeURIComponent(clean.country === "Netherlands" ? "nl" : clean.country.slice(0, 2).toLowerCase())}` },
    { name: "Indeed", emoji: "🌍", featured: false, accuracy: `Local ${clean.country} site`, description: `${clean.employmentType || "All roles"} on the local Indeed domain`, url: `https://${indeedDomain}/jobs?q=${role}&l=${location}&radius=${encodeURIComponent(clean.radius)}${indeedAge ? `&fromage=${indeedAge}` : ""}` },
    { name: "Company career sites", emoji: "🏢", featured: false, accuracy: "Official ATS + exact location", description: `Employer listings that explicitly mention ${clean.city} and ${clean.country}`, url: `https://${googleDomain}/search?q=${encodeURIComponent(`${strictLocalQuery} (site:workdayjobs.com OR site:ashbyhq.com OR site:greenhouse.io OR site:lever.co)`)}` },
    { name: "Recruiter job posts", emoji: "📣", featured: false, accuracy: "Location-required posts", description: `Recent recruiter posts that explicitly mention ${clean.location}`, url: `https://${googleDomain}/search?q=${encodeURIComponent(`${strictLocalQuery} (recruiter OR hiring) job`)}` },
  ];
}

function generateOutreachMessage(profile: MessageProfile) {
  const firstName = profile.recipientName.trim() || "there";
  const role = profile.role.trim() || "the open role";
  const company = profile.company.trim() || "your company";
  const sender = profile.senderName.trim() || "[Your name]";
  const value = profile.value.trim() || "my relevant experience and the perspective I could bring to the team";
  const context = profile.context.trim() ? ` ${profile.context.trim()}` : "";
  const greeting = profile.tone === "Friendly & concise" ? `Hi ${firstName},` : `Hello ${firstName},`;
  const close = profile.tone === "Direct & confident" ? `Best,\n${sender}` : profile.tone === "Senior & strategic" ? `Kind regards,\n${sender}` : `Warmly,\n${sender}`;
  const openingByIntent: Record<MessageProfile["intent"], string> = {
    "Introduce myself": `I’m reaching out regarding the ${role} opportunity at ${company}.`,
    "Ask for a referral": `I’m considering the ${role} opportunity at ${company} and hoped to ask for your perspective.`,
    "Follow up after applying": `I recently applied for the ${role} position at ${company} and wanted to follow up thoughtfully.`,
    "Request a conversation": `I’d value a brief conversation about the ${role} opportunity and the work happening at ${company}.`,
    "Thank them": `Thank you for your time and support regarding the ${role} opportunity at ${company}.`,
  };
  const askByRecipient: Record<MessageProfile["recipientType"], string> = {
    Recruiter: "If the role is still active, I’d appreciate any guidance on fit and the next step in the process.",
    "Hiring manager": "If useful, I’d be glad to share a concise example of how I would approach the team’s priorities in this role.",
    Referral: profile.intent === "Ask for a referral" ? "If, after reviewing my background, you feel comfortable referring me, I would be very grateful—though your honest perspective alone would already help." : "I’d appreciate any perspective you’re comfortable sharing about the team and the role.",
    "Networking contact": "Would you be open to a short 15-minute conversation in the coming days? I’ll gladly work around your schedule.",
  };
  const toneBridge: Record<MessageProfile["tone"], string> = {
    "Warm & professional": `My background includes ${value}, and the opportunity genuinely caught my attention.`,
    "Direct & confident": `I can contribute ${value}, which appears closely aligned with what this role requires.`,
    "Friendly & concise": `I bring ${value}, and the role looks like a strong match.`,
    "Senior & strategic": `The role’s scope resonates with my experience in ${value}, particularly where business priorities and execution need to connect.`,
  };
  return `${greeting}\n\n${openingByIntent[profile.intent]}${context}\n\n${toneBridge[profile.tone]}\n\n${askByRecipient[profile.recipientType]}\n\n${close}`;
}

const trafficLightMeta: Record<TrafficLight, { label: string; dot: string; card: string }> = {
  none: { label: "No signal", dot: "bg-white", card: "border-white/10" },
  green: { label: "Progressing", dot: "bg-emerald-400", card: "border-emerald-400/25" },
  yellow: { label: "Waiting", dot: "bg-amber-400", card: "border-amber-400/25" },
  red: { label: "Blocked / closed", dot: "bg-rose-400", card: "border-rose-400/25" },
};

function Modal({
  title,
  description,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusableSelector = "button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
    window.setTimeout(() => {
      const preferred = modalRef.current?.querySelector<HTMLElement>("[autofocus]");
      const first = modalRef.current?.querySelector<HTMLElement>(focusableSelector);
      (preferred || first)?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableSelector));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}
        role="dialog"
        ref={modalRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id={titleId}>{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-400" id={descriptionId}>{description}</p>}
          </div>
          <button aria-label="Close modal" className="icon-button" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>(emptyApplication);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(emptyContact);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [rewriteDraft, setRewriteDraft] = useState("");
  const [searchProfile, setSearchProfile] = useState<SearchProfile>(emptySearchProfile);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [messageProfile, setMessageProfile] = useState<MessageProfile>(emptyMessageProfile);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [recoveryEntries, setRecoveryEntries] = useState<RecoveryEntry[]>([]);
  const [recoveryApplication, setRecoveryApplication] = useState<Application | null>(null);
  const [recoveryNeed, setRecoveryNeed] = useState<RecoveryNeed>("I need a moment");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setApplications(readStored<Partial<Application>[]>(APPLICATIONS_KEY, demoApplications).map(normalizeApplication));
      setContacts(readStored<(Partial<Contact> & { companyRole?: string })[]>(CONTACTS_KEY, demoContacts).map(normalizeContact));
      setResumes(readStored<ResumeFile[]>(RESUMES_KEY, []));
      setSearchProfile({ ...emptySearchProfile, ...readStored<Partial<SearchProfile>>(SEARCH_PROFILE_KEY, emptySearchProfile) });
      setRecoveryEntries(readStored<RecoveryEntry[]>(RECOVERY_KEY, []));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  }, [applications, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(RESUMES_KEY, JSON.stringify(resumes));
  }, [resumes, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(SEARCH_PROFILE_KEY, JSON.stringify(searchProfile));
  }, [searchProfile, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryEntries));
  }, [recoveryEntries, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey || target.matches("input, textarea, select") || showApplicationModal || showContactModal || showFeedbackModal || recoveryApplication) return;
      if (event.key.toLowerCase() === "a") openNewApplication();
      if (event.key.toLowerCase() === "c") openNewContact();
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  });

  const metrics = useMemo(() => {
    const activeStatuses: ApplicationStatus[] = ["Applied", "Interview", "Follow-up due"];
    return [
      { label: "Active applications", value: applications.filter((item) => activeStatuses.includes(item.status)).length, icon: BriefcaseBusiness },
      { label: "Interview stage", value: applications.filter((item) => item.status === "Interview").length, icon: CalendarClock },
      { label: "Offers", value: applications.filter((item) => item.status === "Offer").length, icon: CheckCircle2 },
      { label: "Networking contacts", value: contacts.length, icon: Users2 },
      { label: "Follow-ups due", value: applications.filter((item) => item.status === "Follow-up due" || isPast(item.nextStepDue)).length + contacts.filter((item) => isPast(item.nextActionDue)).length, icon: CircleAlert },
    ];
  }, [applications, contacts]);

  const insights = useMemo(() => {
    const result: { title: string; text: string; tone: string }[] = [];
    const active = applications.filter((item) => !["Rejected", "Withdrawn"].includes(item.status));
    const missingNextSteps = active.filter((item) => !item.nextStep.trim()).length;
    const interviews = applications.filter((item) => item.status === "Interview").length;
    const followUps = applications.filter((item) => item.status === "Follow-up due").length;
    const statusCounts = applicationStatuses.map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));
    const largestGroup = statusCounts.sort((a, b) => b.count - a.count)[0];

    if (followUps > 0) result.push({ title: "Follow-ups need attention", text: `${followUps} ${followUps === 1 ? "application is" : "applications are"} ready for follow-up. Start there to keep momentum moving.`, tone: "bg-amber-400" });
    if (missingNextSteps > 0) result.push({ title: "Clarify next steps", text: `${missingNextSteps} active ${missingNextSteps === 1 ? "application has" : "applications have"} no next step. Add one so nothing slips through.`, tone: "bg-sky-400" });
    if (interviews > 0) result.push({ title: "Prepare for interviews", text: `${interviews} ${interviews === 1 ? "opportunity is" : "opportunities are"} at interview stage. Keep preparation notes in each application.`, tone: "bg-violet-400" });
    if (applications.some((item) => item.status === "Offer")) result.push({ title: "Offer on the table", text: "Your pipeline includes an offer. Capture any decision points in its notes before your next conversation.", tone: "bg-emerald-400" });
    if (contacts.length < 3) result.push({ title: "Grow your active network", text: `You have ${contacts.length} saved ${contacts.length === 1 ? "contact" : "contacts"}. Add people connected to your most important opportunities.`, tone: "bg-fuchsia-400" });
    if (applications.length >= 4 && largestGroup.count / applications.length >= 0.6) result.push({ title: "Pipeline is concentrated", text: `${largestGroup.count} of ${applications.length} applications share the “${largestGroup.status}” status. Consider what could move the strongest ones forward.`, tone: "bg-rose-400" });
    if (result.length === 0) result.push({ title: "You’re in good shape", text: "Every active application has a next step, and no follow-ups are currently marked due.", tone: "bg-emerald-400" });
    return result.slice(0, 4);
  }, [applications, contacts]);

  const todayFocus = useMemo(() => {
    const followUp = applications.find((item) => item.status === "Follow-up due" || isPast(item.nextStepDue));
    if (followUp) return { eyebrow: "Follow-up due", title: followUp.nextStep || `Follow up with ${followUp.company}`, detail: `${followUp.role} at ${followUp.company}`, target: "applications" };
    const missingStep = applications.find((item) => !["Rejected", "Withdrawn"].includes(item.status) && !item.nextStep.trim());
    if (missingStep) return { eyebrow: "Needs a next step", title: `Plan the next move for ${missingStep.company}`, detail: missingStep.role, target: "applications" };
    const interview = applications.find((item) => item.status === "Interview");
    if (interview) return { eyebrow: "Interview preparation", title: interview.nextStep || `Prepare for ${interview.company}`, detail: `${interview.role} at ${interview.company}`, target: "applications" };
    const contact = contacts.find((item) => item.nextAction.trim());
    if (contact) return { eyebrow: "Networking next step", title: contact.nextAction, detail: `${contact.name} · ${contact.role}${contact.company ? ` at ${contact.company}` : ""}`, target: "networking" };
    return { eyebrow: "Start your day", title: "Add your next opportunity", detail: "A clear pipeline starts with one application.", target: "applications" };
  }, [applications, contacts]);

  const nextBestActions = useMemo(() => {
    const actions: { id: string; score: number; label: string; detail: string; target: string; kind: string }[] = [];
    applications.forEach((item) => {
      if (item.status === "Rejected" && !recoveryEntries.some((entry) => entry.applicationId === item.id)) actions.push({ id: `reset-${item.id}`, score: 105, label: `Take a gentle reset after ${item.company}`, detail: "Pause, keep the learning that helps, and choose one manageable next step.", target: "carvio-reset", kind: "Recover" });
      if (isPast(item.nextStepDue)) actions.push({ id: `app-due-${item.id}`, score: 100, label: item.nextStep || `Follow up with ${item.company}`, detail: `${item.role} · overdue since ${formatDate(item.nextStepDue)}`, target: "applications", kind: "Overdue" });
      if (item.eventDateTime && new Date(item.eventDateTime).getTime() > Date.now() && new Date(item.eventDateTime).getTime() - Date.now() < 72 * 60 * 60 * 1000) actions.push({ id: `app-event-${item.id}`, score: 95, label: `Prepare for ${item.eventType || "interview"}`, detail: `${item.company} · ${formatDate(item.eventDateTime, true)}`, target: "applications", kind: "Prepare" });
      if (!["Rejected", "Withdrawn"].includes(item.status) && !item.nextStep.trim()) actions.push({ id: `app-plan-${item.id}`, score: 75, label: `Define the next move for ${item.company}`, detail: item.role, target: "applications", kind: "Plan" });
      if (item.trafficLight === "yellow") actions.push({ id: `app-wait-${item.id}`, score: 65, label: `Check the waiting status at ${item.company}`, detail: item.nextStep || item.role, target: "applications", kind: "Unblock" });
    });
    contacts.forEach((item) => {
      if (isPast(item.nextActionDue)) actions.push({ id: `contact-due-${item.id}`, score: 90, label: item.nextAction || `Reconnect with ${item.name}`, detail: `${item.name}${item.company ? ` · ${item.company}` : ""} · overdue`, target: "networking", kind: "Reconnect" });
      if (item.eventDateTime && new Date(item.eventDateTime).getTime() > Date.now() && new Date(item.eventDateTime).getTime() - Date.now() < 72 * 60 * 60 * 1000) actions.push({ id: `contact-event-${item.id}`, score: 85, label: `Prepare for your conversation with ${item.name}`, detail: formatDate(item.eventDateTime, true), target: "networking", kind: "Prepare" });
    });
    if (contacts.length < Math.max(3, Math.ceil(applications.length / 2))) actions.push({ id: "grow-network", score: 60, label: "Add one warm connection", detail: "A stronger network can unlock context and referrals for active roles.", target: "networking", kind: "Build" });
    if (actions.length === 0) actions.push({ id: "healthy", score: 10, label: "Your pipeline is under control", detail: "Add a new opportunity or schedule a networking conversation to keep momentum.", target: "applications", kind: "Momentum" });
    return actions.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [applications, contacts, recoveryEntries]);

  const analytics = useMemo(() => {
    const pipeline = applicationStatuses.map((status) => ({ label: status, value: applications.filter((item) => item.status === status).length }));
    const signals = (["green", "yellow", "red"] as TrafficLight[]).map((signal) => ({ label: trafficLightMeta[signal].label, value: [...applications, ...contacts].filter((item) => item.trafficLight === signal).length, color: signal === "green" ? "#34d399" : signal === "yellow" ? "#fbbf24" : "#fb7185" }));
    const sources = Array.from(new Set(applications.map((item) => item.source || "Not specified"))).map((source) => ({ label: source, value: applications.filter((item) => (item.source || "Not specified") === source).length })).sort((a, b) => b.value - a.value).slice(0, 5);
    const appOverdue = applications.filter((item) => isPast(item.nextStepDue)).length;
    const contactOverdue = contacts.filter((item) => isPast(item.nextActionDue)).length;
    const upcoming = applications.filter((item) => item.nextStepDue && !isPast(item.nextStepDue)).length + contacts.filter((item) => item.nextActionDue && !isPast(item.nextActionDue)).length;
    const noDate = applications.filter((item) => !item.nextStepDue && !["Rejected", "Withdrawn"].includes(item.status)).length + contacts.filter((item) => !item.nextActionDue).length;
    const prioritiesData = priorities.map((priority) => ({ label: priority, value: applications.filter((item) => item.priority === priority).length }));
    const workModelsData = ["Remote", "Hybrid", "On-site", "Not specified"].map((model) => ({ label: model, value: applications.filter((item) => (item.workModel || "Not specified") === model).length }));
    const networkingHealth = [
      { label: "Active next step", value: contacts.filter((item) => item.nextAction && item.nextActionDue && !isPast(item.nextActionDue)).length },
      { label: "Overdue", value: contacts.filter((item) => isPast(item.nextActionDue)).length },
      { label: "Needs a plan", value: contacts.filter((item) => !item.nextAction || !item.nextActionDue).length },
    ];
    const salaryGroups = Array.from(new Set(applications.filter((item) => parseSalaryExpectation(item.salary) !== null).map((item) => item.salaryCurrency))).map((currency) => {
      const values = applications.filter((item) => item.salaryCurrency === currency).map((item) => parseSalaryExpectation(item.salary)).filter((value): value is number => value !== null);
      return { label: currency, value: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0, count: values.length };
    });
    return { pipeline, signals, sources, priorities: prioritiesData, workModels: workModelsData, networkingHealth, salaryGroups, followUps: [{ label: "Overdue", value: appOverdue + contactOverdue }, { label: "Upcoming", value: upcoming }, { label: "No date", value: noDate }] };
  }, [applications, contacts]);

  const activeRecoveryEntry = recoveryApplication ? recoveryEntries.find((entry) => entry.applicationId === recoveryApplication.id) : undefined;
  const resolvedSearch = useMemo(() => normalizedSearchProfile(searchProfile), [searchProfile]);
  const searchReadiness = useMemo(() => [resolvedSearch.role, resolvedSearch.city, resolvedSearch.country, searchProfile.skills, searchProfile.seniority, searchProfile.employmentType, searchProfile.datePosted].filter((value) => value.trim()).length, [resolvedSearch, searchProfile]);

  function openNewApplication() {
    setEditingApplicationId(null);
    setApplicationDraft(emptyApplication);
    setShowApplicationModal(true);
  }

  function openEditApplication(application: Application) {
    setEditingApplicationId(application.id);
    const { id: _id, ...draft } = application;
    void _id;
    setApplicationDraft(draft);
    setShowApplicationModal(true);
  }

  function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const savedApplication = { ...applicationDraft, id: editingApplicationId || makeId("app") };
    if (editingApplicationId) {
      setApplications((items) => items.map((item) => item.id === editingApplicationId ? savedApplication : item));
      setNotice("Application updated.");
    } else {
      setApplications((items) => [savedApplication, ...items]);
      setNotice("Application added.");
    }
    setShowApplicationModal(false);
    if (savedApplication.status === "Rejected" && !recoveryEntries.some((entry) => entry.applicationId === savedApplication.id)) {
      window.setTimeout(() => setRecoveryApplication(savedApplication), 250);
    }
  }

  function deleteApplication(application: Application) {
    if (window.confirm(`Delete the ${application.role} application at ${application.company}?`)) {
      setApplications((items) => items.filter((item) => item.id !== application.id));
      setNotice("Application deleted.");
    }
  }

  function updateApplicationStatus(application: Application, status: ApplicationStatus) {
    const updated = { ...application, status };
    setApplications((items) => items.map((item) => item.id === application.id ? updated : item));
    setNotice(`${application.company} moved to ${status}.`);
    if (status === "Rejected" && application.status !== "Rejected" && !recoveryEntries.some((entry) => entry.applicationId === application.id)) {
      window.setTimeout(() => setRecoveryApplication(updated), 250);
    }
  }

  function openNewContact() {
    setEditingContactId(null);
    setContactDraft(emptyContact);
    setShowContactModal(true);
  }

  function openEditContact(contact: Contact) {
    setEditingContactId(contact.id);
    const { id: _id, ...draft } = contact;
    void _id;
    setContactDraft(draft);
    setShowContactModal(true);
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingContactId) {
      setContacts((items) => items.map((item) => item.id === editingContactId ? { ...contactDraft, id: item.id } : item));
      setNotice("Contact updated.");
    } else {
      setContacts((items) => [{ ...contactDraft, id: makeId("contact") }, ...items]);
      setNotice("Contact added.");
    }
    setShowContactModal(false);
  }

  function deleteContact(contact: Contact) {
    if (window.confirm(`Delete ${contact.name} from your contacts?`)) {
      setContacts((items) => items.filter((item) => item.id !== contact.id));
      setNotice("Contact deleted.");
    }
  }

  async function uploadResumes(files: FileList | null) {
    if (!files?.length) return;
    const available = 6 - resumes.length;
    if (available <= 0) {
      setNotice("You can keep up to 6 CV versions in the pilot.");
      return;
    }
    const selected = Array.from(files).slice(0, available);
    const additions = await Promise.all(selected.map(async (file) => {
      const isText = file.type.startsWith("text/") || /\.(txt|md|rtf|csv)$/i.test(file.name);
      let extractedText = "";
      if (isText && file.size <= 2_000_000) extractedText = (await file.text()).slice(0, 15000);
      return { id: makeId("resume"), name: file.name, size: file.size, type: file.type || "Unknown type", addedAt: new Date().toISOString(), extractedText } satisfies ResumeFile;
    }));
    setResumes((items) => [...items, ...additions]);
    const first = additions[0];
    if (first) {
      setSelectedResumeId(first.id);
      if (first.extractedText) setResumeText(first.extractedText.slice(0, 15000));
    }
    setNotice(`${additions.length} CV ${additions.length === 1 ? "version" : "versions"} added.`);
  }

  function selectResume(resume: ResumeFile) {
    setSelectedResumeId(resume.id);
    setResumeText(resume.extractedText || "");
    setRewriteDraft("");
  }

  function removeResume(resume: ResumeFile) {
    if (!window.confirm(`Remove ${resume.name} from Carvio? The original file on your device will not be deleted.`)) return;
    setResumes((items) => items.filter((item) => item.id !== resume.id));
    if (selectedResumeId === resume.id) {
      setSelectedResumeId(null);
      setResumeText("");
      setRewriteDraft("");
    }
    setNotice("CV version removed.");
  }

  function createRewriteDraft() {
    const text = resumeText.trim();
    if (!text) {
      setNotice("Paste your CV text first so the rewrite can be grounded in your real experience.");
      return;
    }
    const cleaned = text
      .replace(/responsible for/gi, "Led")
      .replace(/helped (?:to )?/gi, "Contributed to ")
      .replace(/duties included/gi, "Delivered")
      .replace(/\n{3,}/g, "\n\n");
    setRewriteDraft(`PROFESSIONAL PROFILE\nTailor this 3–4 line introduction to your target role, seniority, and strongest measurable outcomes.\n\nEXPERIENCE & IMPACT\n${cleaned}\n\nFINAL CHECK\n• Lead bullets with action verbs.\n• Add measurable outcomes without inventing facts.\n• Mirror relevant keywords from the job description.\n• Keep the most relevant evidence on page one.`);
    setNotice("Rewrite workspace created from your text.");
  }

  function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recoveryApplication) return;
    const form = new FormData(event.currentTarget);
    const nextAction = String(form.get("nextAction") || "").trim() || (recoveryNeed === "I need a moment" ? "Take the rest of today without job-search pressure" : "Choose one small next step tomorrow");
    const entry: RecoveryEntry = {
      id: makeId("reset"),
      applicationId: recoveryApplication.id,
      company: recoveryApplication.company,
      role: recoveryApplication.role,
      need: recoveryNeed,
      whatWorked: String(form.get("whatWorked") || ""),
      learning: String(form.get("learning") || ""),
      outsideControl: String(form.get("outsideControl") || ""),
      nextAction,
      completedAt: new Date().toISOString(),
    };
    setRecoveryEntries((items) => [entry, ...items.filter((item) => item.applicationId !== entry.applicationId)]);
    setRecoveryApplication(null);
    setNotice("Your reset plan is saved. One step is enough for today 🌿");
  }

  function openRecovery(application?: Application) {
    const target = application || applications.find((item) => item.status === "Rejected" && !recoveryEntries.some((entry) => entry.applicationId === item.id)) || applications.find((item) => item.status === "Rejected");
    if (!target) {
      setNotice("Carvio Reset becomes available when a process is marked Rejected.");
      return;
    }
    const previous = recoveryEntries.find((entry) => entry.applicationId === target.id);
    setRecoveryNeed(previous?.need || "I need a moment");
    setRecoveryApplication(target);
  }

  function toggleSearchSkill(skill: string) {
    const current = searchProfile.skills.split(",").map((item) => item.trim()).filter(Boolean);
    const next = current.some((item) => item.toLowerCase() === skill.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== skill.toLowerCase()) : [...current, skill];
    setSearchProfile({ ...searchProfile, skills: next.join(", ") });
  }

  function resetDemoData() {
    if (window.confirm("Reset applications and contacts to the original demo data? Your current entries will be replaced.")) {
      setApplications(demoApplications);
      setContacts(demoContacts);
      setNotice("Demo data restored.");
    }
  }

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackError("");
    const form = new FormData(event.currentTarget);
    const entry: Feedback = {
      id: makeId("feedback"),
      answers: pilotQuestions.map((question, index) => ({ question, score: Number(form.get(`score-${index}`)), comment: String(form.get(`comment-${index}`) || "") })),
      openFeedback: String(form.get("openFeedback") || ""),
      submittedAt: new Date().toISOString(),
    };
    const previous = readStored<Feedback[]>(FEEDBACK_KEY, []);
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify([...previous, entry]));

    const answers = entry.answers.map((answer, index) => [
      `${index + 1}. ${answer.question}`,
      `Rating: ${answer.score}/5`,
      answer.comment.trim() ? `Comment: ${answer.comment.trim()}` : "Comment: —",
    ].join("\n")).join("\n\n");
    const body = [
      "CARVIO PILOT FEEDBACK",
      `Submitted: ${new Date(entry.submittedAt).toLocaleString()}`,
      "",
      answers,
      "",
      "9. Anything else?",
      entry.openFeedback.trim() || "—",
    ].join("\n");
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent("matanbahat@gmail.com")}&su=${encodeURIComponent("Carvio pilot feedback")}&body=${encodeURIComponent(body)}`;
    const gmailWindow = window.open(gmailUrl, "_blank", "noopener,noreferrer");

    void navigator.clipboard?.writeText(body).catch(() => undefined);
    if (!gmailWindow) {
      setFeedbackError("Your browser blocked the Gmail window. The feedback was copied—allow pop-ups and try again, or paste it into a message to matanbahat@gmail.com.");
      return;
    }
    setShowFeedbackModal(false);
    setNotice("Gmail is ready with your feedback. Please press Send 💛");
  }

  if (!hydrated) {
    return <main className="min-h-screen bg-slate-950" aria-label="Loading Carvio" />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_50%,_#0f172a_100%)] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="relative scroll-mt-28 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:p-8" id="dashboard">
          <div className="hero-orb hero-orb-one" aria-hidden="true">🚀</div><div className="hero-orb hero-orb-two" aria-hidden="true">✨</div>
          <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <Compass className="h-4 w-4" /> Career tracking, reimagined
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Welcome back to Carvio <span className="inline-block animate-wave">👋</span></p>
                <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">Let’s move your search forward.</h1>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-300">One clear next step at a time—across every application and conversation. <span className="emoji-bounce">🎯</span></p>
              </div>
            </div>
            <div>
              <button className="focus-card group w-full text-left" onClick={() => document.getElementById(todayFocus.target)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><CalendarClock className="h-4 w-4" /> Today’s focus</span>
                <span className="mt-4 block text-xs font-medium uppercase tracking-wider text-slate-500">{todayFocus.eyebrow}</span>
                <span className="mt-1 flex items-center justify-between gap-3 text-lg font-semibold text-white">{todayFocus.title}<ChevronRight className="h-5 w-5 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-1" /></span>
                <span className="mt-1 block text-sm text-slate-400">{todayFocus.detail}</span>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className="secondary-button" onClick={resetDemoData} type="button"><RotateCcw className="h-4 w-4" /> Reset demo data</button>
                <button className="secondary-button" onClick={() => { setFeedbackError(""); setShowFeedbackModal(true); }} type="button"><MessageCircleMore className="h-4 w-4" /> Send feedback</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Keyboard shortcuts: <kbd className="shortcut-key">A</kbd> application · <kbd className="shortcut-key">C</kbd> contact</p>
            </div>
          </div>
        </header>

        <nav aria-label="Carvio sections" className="section-nav">
          <div className="section-nav-scroll">
            {[
              ["dashboard", "🏠", "Overview"],
              ["applications", "💼", "Applications"],
              ["networking", "🤝", "Networking"],
              ["carvio-reset", "🌿", "Reset"],
              ["message-studio", "✍️", "Studio"],
              ["cv-lab", "📄", "CV Lab"],
              ["job-search", "🔎", "Job Search"],
              ["analytics", "📊", "Analytics"],
            ].map(([target, emoji, label]) => <button className="section-nav-link" key={target} onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button"><span>{emoji}</span>{label}</button>)}
          </div>
        </nav>

        <section className="pilot-banner">
          <div className="flex items-start gap-4"><span className="emoji-bounce text-4xl">🧪</span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Carvio Private Pilot</p><h2 className="mt-2 text-xl font-semibold sm:text-2xl">You are helping shape what Carvio becomes.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">The founders would genuinely value your honest experience—what helped, what confused you, and what would make Carvio worth returning to. The survey takes about four minutes.</p></div></div>
          <button className="primary-button shrink-0 bg-amber-400 px-5 hover:bg-amber-300" onClick={() => { setFeedbackError(""); setShowFeedbackModal(true); }} type="button"><MessageCircleMore className="h-4 w-4" /> Share pilot feedback</button>
        </section>

        <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div className="metric-card" key={metric.label}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300"><Icon className="h-4 w-4" /></div>
                </div>
                <p className="mt-4 text-3xl font-semibold">{metric.value}</p>
              </div>
            );
          })}
        </section>

        <section className="panel overflow-hidden border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_38%),rgba(15,23,42,0.78)]">
          <div className="section-heading">
            <div>
              <p className="eyebrow flex items-center gap-2 text-cyan-300"><Zap className="h-4 w-4" /> Next Best Action</p>
              <h2 className="section-title">The moves most likely to create momentum</h2>
            </div>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">Prioritized from your data</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {nextBestActions.map((action, index) => (
              <button className="content-card group text-left" key={action.id} onClick={() => document.getElementById(action.target)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">#{index + 1} · {action.kind}</span><ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" /></div>
                <p className="mt-4 font-semibold text-slate-100">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{action.detail}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="reset-panel" id="carvio-reset">
          <div className="pointer-events-none absolute right-4 top-3 text-7xl opacity-10" aria-hidden="true">🌿</div>
          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="eyebrow flex items-center gap-2 text-emerald-300"><HeartHandshake className="h-4 w-4" /> Carvio Reset</p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">A closed process is not a verdict on your value.</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Some opportunities matter, and rejection can hurt. Reset gives you room to pause, keep the progress that belongs to you, and choose one manageable next step—when you are ready.</p>
              <div className="mt-5 flex flex-wrap gap-2"><span className="reset-chip">🫶 No forced positivity</span><span className="reset-chip">🧭 One next step</span><span className="reset-chip">🔒 Private on this device</span></div>
            </div>
            <div className="reset-inner-card">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Progress that stays with you</p><p className="mt-2 text-3xl font-semibold">{applications.filter((item) => item.status === "Interview" || item.status === "Offer" || item.status === "Rejected").length}</p><p className="text-sm text-slate-400">processes that created interview experience or learning</p></div><span className="emoji-bounce text-4xl">🌱</span></div>
              {recoveryEntries[0] && <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3"><p className="text-xs text-emerald-300">Your saved next step</p><p className="mt-1 text-sm text-slate-200">{recoveryEntries[0].nextAction}</p></div>}
              <button className="primary-button mt-4 w-full bg-emerald-500 hover:bg-emerald-400" onClick={() => openRecovery()} type="button"><HeartHandshake className="h-4 w-4" /> {recoveryEntries.length ? "Open my reset plan" : "Start a gentle reset"}</button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">This is reflective career support, not medical or mental-health care.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="panel" id="applications">
            <div className="section-heading">
              <div><p className="eyebrow text-emerald-300">Job applications</p><h2 className="section-title">Active opportunities</h2></div>
              <button className="primary-button" onClick={openNewApplication} type="button"><Plus className="h-4 w-4" /> Add application</button>
            </div>
            <div className="mt-5 space-y-3">
              {applications.length === 0 ? (
                <EmptyState icon={<BriefcaseBusiness className="h-6 w-6" />} title="No applications yet" text="Add your first opportunity to start tracking your pipeline." action="Add application" onAction={openNewApplication} />
              ) : applications.map((application) => (
                <article className={`content-card ${trafficLightMeta[application.trafficLight].card}`} key={application.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span aria-label={trafficLightMeta[application.trafficLight].label} className={`h-2.5 w-2.5 rounded-full ring-4 ring-white/5 ${trafficLightMeta[application.trafficLight].dot}`} /><h3 className="font-semibold text-slate-100">{application.role}</h3></div>
                      <p className="mt-1 text-sm text-slate-400">{application.company}{application.location ? ` · ${application.location}` : ""}{application.workModel ? ` · ${application.workModel}` : ""}</p>
                    </div>
                    <select
                      aria-label={`Status for ${application.role} at ${application.company}`}
                      className={`status-select ${statusStyles[application.status]}`}
                      onChange={(event) => updateApplicationStatus(application, event.target.value as ApplicationStatus)}
                      value={application.status}
                    >
                      {applicationStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    {application.priority && <span className="data-chip">{application.priority} priority</span>}
                    {application.source && <span className="data-chip">Source: {application.source}</span>}
                    {application.appliedDate && <span className="data-chip">Applied {formatDate(application.appliedDate)}</span>}
                    {application.salary && <span className="data-chip">💰 Expected: {application.salaryCurrency} {application.salary}</span>}
                  </div>
                  <div className="mt-4 rounded-xl bg-white/[0.04] p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Current stage / next step</p>
                    <p className="mt-1 text-sm text-slate-300">{application.nextStep || "No next step added"}{application.nextStepDue ? ` · ${isPast(application.nextStepDue) ? "Overdue " : "Due "}${formatDate(application.nextStepDue)}` : ""}</p>
                  </div>
                  {application.eventDateTime && (
                    <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-400/5 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-xs font-medium uppercase tracking-wider text-violet-300">{application.eventType || "Interview / meeting"}</p><p className="mt-1 text-sm text-slate-200">{formatDate(application.eventDateTime, true)}</p></div>
                        <div className="flex flex-wrap gap-2"><button className="calendar-button" onClick={() => openGoogleCalendar(`${application.eventType}: ${application.role} at ${application.company}`, application.eventDateTime, application.notes || application.nextStep, application.location)} type="button"><CalendarPlus className="h-4 w-4" /> Google</button><button className="calendar-button" onClick={() => downloadICS(`${application.eventType}: ${application.role} at ${application.company}`, application.eventDateTime, application.notes || application.nextStep, application.location)} type="button"><Download className="h-4 w-4" /> Calendar file</button></div>
                      </div>
                    </div>
                  )}
                  {application.notes && <p className="mt-3 text-sm text-slate-400">{application.notes}</p>}
                  <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                    <button className="text-button" onClick={() => openEditApplication(application)} type="button"><Pencil className="h-4 w-4" /> Edit</button>
                    <button className="text-button text-violet-300 hover:text-violet-200" onClick={() => { if (application.eventDateTime) downloadICS(`${application.eventType}: ${application.role} at ${application.company}`, application.eventDateTime, application.notes || application.nextStep, application.location); else { openEditApplication(application); setNotice("Add an interview or meeting date, then save to enable calendar export."); } }} type="button"><CalendarPlus className="h-4 w-4" /> Calendar</button>
                    <button className="text-button text-rose-300 hover:text-rose-200" onClick={() => deleteApplication(application)} type="button"><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading">
              <div><p className="eyebrow text-amber-300">Smart insights</p><h2 className="section-title">Your next moves</h2></div>
              <div className="rounded-full border border-amber-400/20 bg-amber-400/10 p-2 text-amber-200"><Sparkles className="h-4 w-4" /></div>
            </div>
            <div className="mt-5 space-y-3">
              {insights.map((insight) => (
                <div className="content-card flex gap-3" key={insight.title}>
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${insight.tone}`} />
                  <div><p className="font-semibold text-slate-100">{insight.title}</p><p className="mt-1 text-sm leading-6 text-slate-400">{insight.text}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-xs text-slate-400">
              <BarChart3 className="h-4 w-4 shrink-0 text-cyan-300" /> Insights are calculated only from the applications and contacts saved on this device.
            </div>
          </div>
        </section>

        <section className="panel" id="networking">
          <div className="section-heading">
            <div><p className="eyebrow text-fuchsia-300">Networking</p><h2 className="section-title">Warm connections</h2></div>
            <button className="primary-button bg-fuchsia-500 hover:bg-fuchsia-400" onClick={openNewContact} type="button"><Plus className="h-4 w-4" /> Add contact</button>
          </div>
          {contacts.length === 0 ? (
            <div className="mt-5"><EmptyState icon={<Users2 className="h-6 w-6" />} title="No contacts yet" text="Add someone you want to keep in touch with." action="Add contact" onAction={openNewContact} /></div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {contacts.map((contact) => (
                <article className={`content-card ${trafficLightMeta[contact.trafficLight].card}`} key={contact.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="flex items-center gap-2"><span aria-label={trafficLightMeta[contact.trafficLight].label} className={`h-2.5 w-2.5 rounded-full ring-4 ring-white/5 ${trafficLightMeta[contact.trafficLight].dot}`} /><h3 className="font-semibold text-slate-100">{contact.name}</h3></div><p className="mt-1 text-sm text-slate-400">{contact.role}{contact.company ? ` at ${contact.company}` : ""}</p></div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fuchsia-300" />
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">{contact.relationship}</p>
                  <div className="mt-3 rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-500">Next action</p><p className="mt-1 text-sm text-slate-300">{contact.nextAction || "No next action added"}{contact.nextActionDue ? ` · ${isPast(contact.nextActionDue) ? "Overdue " : "Due "}${formatDate(contact.nextActionDue)}` : ""}</p></div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">{contact.lastContactDate && <span className="data-chip">Last contact {formatDate(contact.lastContactDate)}</span>}{contact.email && <a className="data-chip hover:text-white" href={`mailto:${contact.email}`}><Mail className="h-3.5 w-3.5" /> Email</a>}{contact.phone && <a className="data-chip hover:text-white" href={`tel:${contact.phone}`}><Phone className="h-3.5 w-3.5" /> Call</a>}{contact.linkedInUrl && <a className="data-chip hover:text-white" href={contact.linkedInUrl} rel="noreferrer" target="_blank"><LinkIcon className="h-3.5 w-3.5" /> LinkedIn</a>}</div>
                  {contact.eventDateTime && <div className="mt-3 rounded-xl border border-fuchsia-400/15 bg-fuchsia-400/5 p-3"><p className="text-xs font-medium uppercase tracking-wider text-fuchsia-300">{contact.eventType || "Networking meeting"}</p><p className="mt-1 text-sm text-slate-200">{formatDate(contact.eventDateTime, true)}</p><div className="mt-3 flex flex-wrap gap-2"><button className="calendar-button" onClick={() => openGoogleCalendar(`${contact.eventType} with ${contact.name}`, contact.eventDateTime, contact.notes || contact.nextAction, contact.company)} type="button"><CalendarPlus className="h-4 w-4" /> Google</button><button className="calendar-button" onClick={() => downloadICS(`${contact.eventType} with ${contact.name}`, contact.eventDateTime, contact.notes || contact.nextAction, contact.company)} type="button"><Download className="h-4 w-4" /> Calendar file</button></div></div>}
                  {contact.notes && <p className="mt-3 text-sm text-slate-400">{contact.notes}</p>}
                  <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                    <button className="text-button" onClick={() => openEditContact(contact)} type="button"><Pencil className="h-4 w-4" /> Edit</button>
                    <button className="text-button text-fuchsia-300 hover:text-fuchsia-200" onClick={() => { if (contact.eventDateTime) downloadICS(`${contact.eventType} with ${contact.name}`, contact.eventDateTime, contact.notes || contact.nextAction, contact.company); else { openEditContact(contact); setNotice("Add a networking date and time, then save to enable calendar export."); } }} type="button"><CalendarPlus className="h-4 w-4" /> Calendar</button>
                    <button className="text-button text-rose-300 hover:text-rose-200" onClick={() => deleteContact(contact)} type="button"><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="message-studio-panel" id="message-studio">
          <div className="pointer-events-none absolute -right-8 -top-8 text-8xl opacity-10">💬</div>
          <div className="section-heading relative">
            <div><p className="eyebrow flex items-center gap-2 text-pink-300"><span className="emoji-bounce">✍️</span> Message Studio</p><h2 className="section-title">Write outreach people will actually want to answer</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose who you’re contacting, the tone, and your goal. Carvio builds a thoughtful draft you can edit, copy, or send immediately.</p></div>
            <div className="message-sparkle" aria-hidden="true">✨</div>
          </div>
          <div className="relative mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <fieldset><legend className="text-sm font-semibold text-slate-200">1. Who are you contacting?</legend><div className="mt-3 grid grid-cols-2 gap-2">{([{"label":"Recruiter","emoji":"🧲"},{"label":"Hiring manager","emoji":"🎯"},{"label":"Referral","emoji":"🤝"},{"label":"Networking contact","emoji":"☕"}] as { label: MessageProfile["recipientType"]; emoji: string }[]).map((item) => <button aria-pressed={messageProfile.recipientType === item.label} className={`choice-card ${messageProfile.recipientType === item.label ? "choice-card-active" : ""}`} key={item.label} onClick={() => setMessageProfile({ ...messageProfile, recipientType: item.label })} type="button"><span className="text-2xl">{item.emoji}</span><span>{item.label}</span></button>)}</div></fieldset>
              <fieldset><legend className="text-sm font-semibold text-slate-200">2. What do you want?</legend><div className="mt-3 flex flex-wrap gap-2">{(["Introduce myself", "Ask for a referral", "Follow up after applying", "Request a conversation", "Thank them"] as MessageProfile["intent"][]).map((intent) => <button aria-pressed={messageProfile.intent === intent} className={`message-pill ${messageProfile.intent === intent ? "message-pill-active" : ""}`} key={intent} onClick={() => setMessageProfile({ ...messageProfile, intent })} type="button">{intent}</button>)}</div></fieldset>
              <fieldset><legend className="text-sm font-semibold text-slate-200">3. Choose your tone</legend><div className="mt-3 flex flex-wrap gap-2">{(["Warm & professional", "Direct & confident", "Friendly & concise", "Senior & strategic"] as MessageProfile["tone"][]).map((tone) => <button aria-pressed={messageProfile.tone === tone} className={`message-pill ${messageProfile.tone === tone ? "message-pill-active" : ""}`} key={tone} onClick={() => setMessageProfile({ ...messageProfile, tone })} type="button">{tone}</button>)}</div></fieldset>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Recipient name"><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, recipientName: event.target.value })} placeholder="Dana" value={messageProfile.recipientName} /></Field><Field label="Recipient email"><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, recipientEmail: event.target.value })} placeholder="dana@company.com" type="email" value={messageProfile.recipientEmail} /></Field><Field label="Company"><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, company: event.target.value })} placeholder="Company name" value={messageProfile.company} /></Field><Field label="Target role"><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, role: event.target.value })} placeholder="Role title" value={messageProfile.role} /></Field><Field label="Your name"><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, senderName: event.target.value })} placeholder="Your name" value={messageProfile.senderName} /></Field><Field label="Your strongest relevant value"><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, value: event.target.value })} placeholder="e.g. global HR leadership" value={messageProfile.value} /></Field></div>
              <Field label="Personal context (optional)"><textarea className="form-control min-h-20 resize-y" onChange={(event) => setMessageProfile({ ...messageProfile, context: event.target.value })} placeholder="A shared connection, recent conversation, or specific reason for reaching out…" value={messageProfile.context} /></Field>
              <button className="primary-button message-generate-button w-full sm:w-auto" onClick={() => { setGeneratedMessage(generateOutreachMessage(messageProfile)); setNotice("Your outreach draft is ready ✨"); }} type="button"><WandSparkles className="h-4 w-4" /> Create my message</button>
            </div>
            <div className="message-preview">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-pink-400/10 p-2.5 text-pink-300"><MessagesSquare className="h-5 w-5" /></div><div><h3 className="font-semibold">Your outreach draft</h3><p className="text-xs text-slate-500">Fully editable before sending</p></div></div><span className="emoji-bounce text-2xl">💌</span></div>
              {generatedMessage ? <><textarea aria-label="Generated outreach message" className="form-control mt-5 min-h-80 resize-y leading-7" onChange={(event) => setGeneratedMessage(event.target.value)} value={generatedMessage} /><div className="mt-4 flex flex-wrap gap-2"><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(generatedMessage); setNotice("Message copied 📋"); }} type="button"><Copy className="h-4 w-4" /> Copy</button><button className="primary-button bg-pink-500 hover:bg-pink-400" onClick={() => { const subject = `${messageProfile.intent}: ${messageProfile.role || "opportunity"} at ${messageProfile.company || "your company"}`; window.location.href = `mailto:${encodeURIComponent(messageProfile.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generatedMessage)}`; }} type="button"><Send className="h-4 w-4" /> Send by email</button></div><p className="mt-3 text-xs leading-5 text-slate-500">Your device will open its default email application. You can choose the sending account there, review the message, and press Send.</p></> : <div className="mt-5 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-pink-400/20 bg-pink-400/5 p-8 text-center"><span className="emoji-bounce text-5xl">🪄</span><p className="mt-5 font-semibold">Your polished message will appear here</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Complete the essentials, choose a style, and let Carvio shape a concise, credible outreach.</p></div>}
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden" id="cv-lab">
          <div className="section-heading">
            <div><p className="eyebrow flex items-center gap-2 text-emerald-300"><span className="emoji-bounce">📄</span> CV Lab</p><h2 className="section-title">Turn every CV version into a stronger story</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Keep up to six versions, receive a private structure review, and build a grounded rewrite without inventing experience.</p></div>
            <label className={`primary-button ${resumes.length >= 6 ? "pointer-events-none opacity-50" : ""}`}><UploadCloud className="h-4 w-4" /> Upload CV<input className="sr-only" disabled={resumes.length >= 6} multiple onChange={(event) => { void uploadResumes(event.target.files); event.target.value = ""; }} type="file" /></label>
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Saved versions</span><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">{resumes.length}/6</span></div>
              {resumes.length === 0 ? <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-emerald-400/5 p-8 text-center"><FileText className="mx-auto h-9 w-9 text-emerald-300" /><p className="mt-3 font-medium">Upload your first CV</p><p className="mt-2 text-sm leading-6 text-slate-400">Any file type can be registered. Text-based files can be reviewed automatically in this private pilot.</p></div> : resumes.map((resume) => <button className={`content-card flex w-full items-center gap-3 text-left ${selectedResumeId === resume.id ? "border-emerald-400/35 bg-emerald-400/5" : ""}`} key={resume.id} onClick={() => selectResume(resume)} type="button"><div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><FileCheck2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-100">{resume.name}</p><p className="mt-1 text-xs text-slate-500">{formatFileSize(resume.size)} · {resume.extractedText ? "Text ready" : "Text needed"}</p></div><span className="icon-button h-8 w-8" onClick={(event) => { event.stopPropagation(); removeResume(resume); }} role="button" tabIndex={0}><X className="h-4 w-4" /></span></button>)}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
              <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-400/10 p-2.5 text-violet-300"><WandSparkles className="h-5 w-5" /></div><div><h3 className="font-semibold">Professional CV review ✨</h3><p className="text-xs text-slate-500">Private, rules-based pilot review on this device</p></div></div>
              <Field label="CV text for review"><textarea className="form-control mt-1 min-h-44 resize-y" onChange={(event) => setResumeText(event.target.value)} placeholder="Text files fill this automatically. For PDF, DOCX, scans, or other formats, paste the CV text here for an accurate review." value={resumeText} /></Field>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{reviewResumeText(resumeText).map((item, index) => <div className="insight-box" key={item}><p className="text-xs font-semibold text-cyan-300">{index === 0 ? "Top observation" : `Review point ${index + 1}`}</p><p className="mt-2 text-sm leading-6 text-slate-300">{item}</p></div>)}</div>
              <div className="mt-5 flex flex-wrap items-center gap-3"><button className="primary-button bg-violet-500 hover:bg-violet-400" onClick={createRewriteDraft} type="button"><WandSparkles className="h-4 w-4" /> Create rewrite workspace</button><span className="text-xs leading-5 text-slate-500">Generative AI is not claimed in this local pilot; a secure server connection is required before AI rewriting can be enabled.</span></div>
              {rewriteDraft && <div className="mt-5"><Field label="Improved working draft"><textarea className="form-control min-h-64 resize-y" onChange={(event) => setRewriteDraft(event.target.value)} value={rewriteDraft} /></Field><button className="secondary-button mt-3" onClick={() => { void navigator.clipboard.writeText(rewriteDraft); setNotice("Rewrite draft copied."); }} type="button">📋 Copy draft</button></div>}
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden" id="job-search">
          <div className="section-heading"><div><p className="eyebrow flex items-center gap-2 text-sky-300"><span className="emoji-bounce">🚀</span> Precision Job Search</p><h2 className="section-title">Build one precise search. Run it across trusted sources.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Role and location are sent as separate filters, so “HRBP in Amsterdam” stays in Amsterdam—not a personalized location elsewhere.</p></div><div className="search-readiness"><span className="text-xs text-slate-400">Search quality</span><strong className="text-lg text-cyan-200">{Math.round(searchReadiness / 7 * 100)}%</strong><div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${searchReadiness / 7 * 100}%` }} /></div></div></div>

          <div className="mt-6 rounded-2xl border border-sky-400/15 bg-sky-400/5 p-4"><div className="flex items-start gap-3"><span className="text-2xl">📍</span><div><p className="font-semibold text-sky-100">Location lock</p><p className="mt-1 text-sm leading-6 text-slate-400">Carvio will search for <strong className="text-slate-200">{resolvedSearch.role || "your role"}</strong> in <strong className="text-slate-200">{resolvedSearch.location || "your selected location"}</strong>. City and country remain separate from keywords.</p>{searchProfile.role.match(/\s+in\s+/i) && !searchProfile.location && <p className="mt-2 text-xs text-amber-300">✓ We detected the location inside your role entry and separated it automatically.</p>}</div></div></div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Target role"><input className="form-control" list="carvio-role-options" onChange={(event) => setSearchProfile({ ...searchProfile, role: event.target.value })} placeholder="e.g. HR Business Partner" value={searchProfile.role} /><datalist id="carvio-role-options">{roleSuggestions.map((role) => <option key={role} value={role} />)}</datalist></Field>
            <Field label="Country"><select className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, country: event.target.value, location: "" })} value={searchProfile.country}>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></Field>
            <Field label="City / area"><input className="form-control" list="carvio-city-options" onChange={(event) => setSearchProfile({ ...searchProfile, location: event.target.value })} placeholder="e.g. Amsterdam" value={searchProfile.location} /><datalist id="carvio-city-options">{(citySuggestions[searchProfile.country] || []).map((city) => <option key={city} value={city} />)}</datalist></Field>
            <Field label="Search radius"><select className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, radius: event.target.value })} value={searchProfile.radius}>{["5", "10", "25", "50", "100"].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></Field>
            <Field label="Seniority"><select className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, seniority: event.target.value })} value={searchProfile.seniority}><option value="">Any level</option><option>Entry level</option><option>Associate</option><option>Mid-Senior level</option><option>Director</option><option>Executive</option></select></Field>
            <Field label="Employment type"><select className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, employmentType: event.target.value })} value={searchProfile.employmentType}><option value="">Any type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option><option>Internship</option></select></Field>
            <Field label="Work model"><select className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, workModel: event.target.value })} value={searchProfile.workModel}><option value="">Any model</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select></Field>
            <Field label="Date posted"><select className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, datePosted: event.target.value })} value={searchProfile.datePosted}><option>Past 24 hours</option><option>Past week</option><option>Past month</option><option>Any time</option></select></Field>
            <Field label="Industry"><input className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, industry: event.target.value })} placeholder="SaaS, healthcare, retail…" value={searchProfile.industry} /></Field>
          </div>

          <fieldset className="mt-5"><legend className="text-sm font-medium text-slate-200">Skills — select or type your own</legend><div className="mt-3 flex flex-wrap gap-2">{skillSuggestions.map((skill) => { const selected = searchProfile.skills.split(",").map((item) => item.trim().toLowerCase()).includes(skill.toLowerCase()); return <button aria-pressed={selected} className={`skill-chip ${selected ? "skill-chip-selected" : ""}`} key={skill} onClick={() => toggleSearchSkill(skill)} type="button">{selected ? "✓ " : "+ "}{skill}</button>; })}</div><input aria-label="Additional skills" className="form-control mt-3" onChange={(event) => setSearchProfile({ ...searchProfile, skills: event.target.value })} placeholder="Additional skills, separated by commas" value={searchProfile.skills} /></fieldset>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]"><Field label="Exclude keywords"><input className="form-control" onChange={(event) => setSearchProfile({ ...searchProfile, exclude: event.target.value })} placeholder="sales, internship, junior…" value={searchProfile.exclude} /></Field><button className="primary-button self-end px-7" disabled={!resolvedSearch.role || !resolvedSearch.city || !resolvedSearch.country} onClick={() => { setShowSearchResults(true); window.setTimeout(() => document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50); }} type="button"><Search className="h-4 w-4" /> Search {resolvedSearch.city || "location"}</button></div>
          {(!resolvedSearch.city || !resolvedSearch.country) && <p className="mt-2 text-xs text-amber-300">Choose both city and country to prevent broad or incorrect location results.</p>}

          {showSearchResults && <div className="mt-7" id="search-results"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-200">Live search routes for {resolvedSearch.role}</p><p className="text-sm text-slate-500">Location locked to {resolvedSearch.location} · {searchProfile.radius} km · {searchProfile.datePosted}</p></div><span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-300">Original sources ↗</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{jobSearchSources(searchProfile).map((source) => <a className={`search-source-card group ${source.featured ? "search-source-featured" : ""}`} href={source.url} key={source.name} rel="noreferrer" target="_blank"><div className="flex items-center justify-between"><span className="text-3xl transition group-hover:scale-110">{source.emoji}</span>{source.featured ? <span className="rounded-full bg-cyan-400 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-950">Recommended</span> : <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />}</div><p className="mt-4 font-semibold text-slate-100">{source.name}</p><span className="mt-2 inline-flex rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">{source.accuracy}</span><p className="mt-3 text-sm leading-6 text-slate-400">{source.description}</p><span className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-300">Open matching jobs <ChevronRight className="h-3.5 w-3.5" /></span></a>)}</div><p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-5 text-slate-400">Use LinkedIn Local first. Signed-in platforms may still insert sponsored or recommended jobs outside the selected area; treat those as provider recommendations, not Carvio matches. Always verify the location shown on the job itself.</p></div>}
        </section>

        <section className="panel" id="analytics">
          <div className="section-heading">
            <div><p className="eyebrow flex items-center gap-2 text-violet-300"><TrendingUp className="h-4 w-4" /> Career analytics</p><h2 className="section-title">See what your search is telling you</h2></div>
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">Live · based on this device</span>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <AnalyticsCard title="Pipeline distribution" subtitle="Where every application currently sits" icon={<BarChart3 className="h-5 w-5" />} insight={applications.length ? `${analytics.pipeline.reduce((best, item) => item.value > best.value ? item : best, analytics.pipeline[0]).label} is currently your largest pipeline stage.` : "Add applications to reveal your pipeline shape."} recommendation={applications.some((item) => item.status === "Follow-up due") ? "Start with follow-ups before adding more applications." : "Focus on moving the strongest active applications one stage forward."}>
              <BarRows data={analytics.pipeline} colors={["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#94a3b8"]} />
            </AnalyticsCard>
            <AnalyticsCard title="Traffic-light health" subtitle="White defaults are excluded for a more honest signal" icon={<Target className="h-5 w-5" />} insight={analytics.signals.reduce((sum, item) => sum + item.value, 0) ? `${analytics.signals.find((item) => item.value === Math.max(...analytics.signals.map((signal) => signal.value)))?.label} is the dominant signal across tracked relationships and opportunities.` : "No colored signals yet—white entries are intentionally excluded."} recommendation={analytics.signals.find((item) => item.label === "Blocked / closed")?.value ? "Review red items: archive closed ones and define an unblock action for the rest." : "Assign signals as soon as you know whether an item is progressing, waiting, or blocked."}>
              <DonutChart data={analytics.signals} />
            </AnalyticsCard>
            <AnalyticsCard title="Application sources" subtitle="Where your current opportunities came from" icon={<Compass className="h-5 w-5" />} insight={analytics.sources.length ? `${analytics.sources[0].label} generated the largest share of your tracked applications.` : "Source data will show which channels feed your pipeline."} recommendation={analytics.sources.some((item) => item.label === "Not specified") ? "Complete the source field so future channel decisions are evidence-based." : "Compare source volume with interview-stage outcomes before investing more time."}>
              <BarRows data={analytics.sources} colors={["#22d3ee", "#c084fc", "#f472b6", "#34d399", "#fbbf24"]} />
            </AnalyticsCard>
            <AnalyticsCard title="Follow-up readiness" subtitle="Deadlines across applications and networking" icon={<Clock3 className="h-5 w-5" />} insight={`${analytics.followUps[0].value} overdue · ${analytics.followUps[1].value} upcoming · ${analytics.followUps[2].value} without a date.`} recommendation={analytics.followUps[0].value ? "Clear overdue actions first; short, thoughtful follow-ups protect warm opportunities." : analytics.followUps[2].value ? "Add a due date to every active next action so Carvio can prioritize it." : "Your action dates are healthy—protect that rhythm with a short daily review."}>
              <BarRows data={analytics.followUps} colors={["#fb7185", "#34d399", "#64748b"]} />
            </AnalyticsCard>
            <AnalyticsCard title="Priority balance" subtitle="How intentionally your effort is distributed" icon={<Zap className="h-5 w-5" />} insight={`${analytics.priorities.find((item) => item.value === Math.max(...analytics.priorities.map((priority) => priority.value)))?.label || "No"} priority applications currently lead your pipeline.`} recommendation={analytics.priorities.find((item) => item.label === "High")?.value ? "Protect preparation and follow-up time for high-priority roles before adding low-fit volume." : "Mark your strongest opportunities as high priority so daily actions reflect real value."}>
              <BarRows data={analytics.priorities} colors={["#94a3b8", "#38bdf8", "#fb7185"]} />
            </AnalyticsCard>
            <AnalyticsCard title="Work-model fit" subtitle="Remote, hybrid, and on-site mix" icon={<MapPin className="h-5 w-5" />} insight={applications.length ? `${analytics.workModels.reduce((best, item) => item.value > best.value ? item : best, analytics.workModels[0]).label} is the most common work model in your search.` : "Work-model preferences will appear after you add applications."} recommendation={analytics.workModels.find((item) => item.label === "Not specified")?.value ? "Complete missing work-model fields to see whether your pipeline matches your lifestyle goals." : "Check that this mix reflects what you genuinely want—not only what is easiest to find."}>
              <BarRows data={analytics.workModels} colors={["#22d3ee", "#c084fc", "#fbbf24", "#64748b"]} />
            </AnalyticsCard>
            <AnalyticsCard title="Salary expectations" subtitle="Average expectation, kept separate by currency" icon={<span className="text-lg">💰</span>} insight={analytics.salaryGroups.length ? analytics.salaryGroups.map((item) => `${compactMoney(item.value, item.label)} across ${item.count} ${item.count === 1 ? "role" : "roles"}`).join(" · ") : "Add salary expectations to applications to build your compensation picture."} recommendation={analytics.salaryGroups.length ? "Compare expectations only within the same currency and employment market; validate each range against role scope, seniority, and total compensation." : "Add a realistic range—not only one number—to your strongest applications so negotiations start with a clear position."}>
              <SalaryBars data={analytics.salaryGroups} />
            </AnalyticsCard>
            <AnalyticsCard title="Networking health" subtitle="Whether warm relationships have a clear next move" icon={<Users2 className="h-5 w-5" />} insight={`${analytics.networkingHealth[0].value} active · ${analytics.networkingHealth[1].value} overdue · ${analytics.networkingHealth[2].value} needing a plan.`} recommendation={analytics.networkingHealth[1].value ? "Reconnect with overdue contacts using a specific, low-pressure reason to speak." : analytics.networkingHealth[2].value ? "Give every important relationship a respectful next action and date." : "Your networking rhythm is strong—keep conversations useful and human."}>
              <BarRows data={analytics.networkingHealth} colors={["#34d399", "#fb7185", "#64748b"]} />
            </AnalyticsCard>
          </div>
        </section>
      </div>

      {notice && <div aria-atomic="true" aria-live="polite" className="toast" role="status"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /><span>{notice}</span><button aria-label="Dismiss notification" className="ml-1 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={() => setNotice("")} type="button"><X className="h-4 w-4" /></button></div>}

      {showApplicationModal && (
        <Modal title={editingApplicationId ? "Edit application" : "Add application"} description="Capture the opportunity, its signal, timing, and your next move." onClose={() => setShowApplicationModal(false)}>
          <form className="space-y-5" onSubmit={saveApplication}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company"><input autoFocus className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, company: e.target.value })} required value={applicationDraft.company} /></Field>
              <Field label="Role"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, role: e.target.value })} required value={applicationDraft.role} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Pipeline stage"><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, status: e.target.value as ApplicationStatus })} value={applicationDraft.status}>{applicationStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Priority"><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, priority: e.target.value as ApplicationDraft["priority"] })} value={applicationDraft.priority}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field></div>
            <TrafficLightPicker label="Process signal" onChange={(trafficLight) => setApplicationDraft({ ...applicationDraft, trafficLight })} value={applicationDraft.trafficLight} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Source"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, source: e.target.value })} placeholder="Referral, LinkedIn, careers page…" value={applicationDraft.source} /></Field><Field label="Applied date"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, appliedDate: e.target.value })} type="date" value={applicationDraft.appliedDate} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Location"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, location: e.target.value })} placeholder="City or region" value={applicationDraft.location} /></Field><Field label="Work model"><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, workModel: e.target.value as ApplicationDraft["workModel"] })} value={applicationDraft.workModel}>{workModels.map((model) => <option key={model || "unset"} value={model}>{model || "Not specified"}</option>)}</select></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Contact name"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, contactName: e.target.value })} value={applicationDraft.contactName} /></Field><div className="grid grid-cols-[110px_1fr] gap-2"><Field label="Currency"><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, salaryCurrency: e.target.value as ApplicationDraft["salaryCurrency"] })} value={applicationDraft.salaryCurrency}>{["ILS", "USD", "EUR", "GBP", "Other"].map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label="Salary expectation"><input className="form-control" inputMode="decimal" onChange={(e) => setApplicationDraft({ ...applicationDraft, salary: e.target.value })} placeholder="e.g. 25,000 or 90k–105k" value={applicationDraft.salary} /></Field></div></div>
            <Field label="Job link"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, jobUrl: e.target.value })} placeholder="https://…" type="url" value={applicationDraft.jobUrl} /></Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_190px]"><Field label="Current stage / next step"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, nextStep: e.target.value })} placeholder="e.g. Prepare for recruiter screen" required value={applicationDraft.nextStep} /></Field><Field label="Due date"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, nextStepDue: e.target.value })} type="date" value={applicationDraft.nextStepDue} /></Field></div>
            <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4"><p className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-200"><CalendarPlus className="h-4 w-4" /> Interview or meeting</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Event type"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, eventType: e.target.value })} placeholder="Interview, recruiter call…" value={applicationDraft.eventType} /></Field><Field label="Date & time"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, eventDateTime: e.target.value })} type="datetime-local" value={applicationDraft.eventDateTime} /></Field></div><p className="mt-3 text-xs leading-5 text-slate-400">After saving, use Google Calendar or download a universal .ics file for Apple, Outlook, Samsung, and other calendars.</p></div>
            <Field label="Notes (optional)"><textarea className="form-control min-h-24 resize-y" onChange={(e) => setApplicationDraft({ ...applicationDraft, notes: e.target.value })} value={applicationDraft.notes} /></Field>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowApplicationModal(false)} type="button">Cancel</button><button className="primary-button" type="submit">{editingApplicationId ? "Save changes" : "Add application"}</button></div>
          </form>
        </Modal>
      )}

      {showContactModal && (
        <Modal title={editingContactId ? "Edit contact" : "Add contact"} description="Build a useful relationship history and never miss the next touchpoint." onClose={() => setShowContactModal(false)}>
          <form className="space-y-5" onSubmit={saveContact}>
            <Field label="Name"><input autoFocus className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} required value={contactDraft.name} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Company"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, company: e.target.value })} value={contactDraft.company} /></Field><Field label="Role"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value })} required value={contactDraft.role} /></Field></div>
            <Field label="Relationship"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, relationship: e.target.value })} placeholder="e.g. Former colleague" required value={contactDraft.relationship} /></Field>
            <TrafficLightPicker label="Relationship signal" onChange={(trafficLight) => setContactDraft({ ...contactDraft, trafficLight })} value={contactDraft.trafficLight} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Email"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} type="email" value={contactDraft.email} /></Field><Field label="Phone"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} type="tel" value={contactDraft.phone} /></Field></div>
            <Field label="LinkedIn profile"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/in/…" type="url" value={contactDraft.linkedInUrl} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Last contact date"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, lastContactDate: e.target.value })} type="date" value={contactDraft.lastContactDate} /></Field><Field label="Next action due"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, nextActionDue: e.target.value })} type="date" value={contactDraft.nextActionDue} /></Field></div>
            <Field label="Next action"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, nextAction: e.target.value })} placeholder="Send a thank-you, ask for a call…" required value={contactDraft.nextAction} /></Field>
            <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/5 p-4"><p className="mb-4 flex items-center gap-2 text-sm font-semibold text-fuchsia-200"><CalendarPlus className="h-4 w-4" /> Networking event</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Event type"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, eventType: e.target.value })} placeholder="Coffee chat, call…" value={contactDraft.eventType} /></Field><Field label="Date & time"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, eventDateTime: e.target.value })} type="datetime-local" value={contactDraft.eventDateTime} /></Field></div><p className="mt-3 text-xs leading-5 text-slate-400">Save first, then add the event to Google, Apple, Outlook, Samsung, or another device calendar.</p></div>
            <Field label="Notes (optional)"><textarea className="form-control min-h-24 resize-y" onChange={(e) => setContactDraft({ ...contactDraft, notes: e.target.value })} value={contactDraft.notes} /></Field>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowContactModal(false)} type="button">Cancel</button><button className="primary-button" type="submit">{editingContactId ? "Save changes" : "Add contact"}</button></div>
          </form>
        </Modal>
      )}

      {recoveryApplication && (
        <Modal title="Carvio Reset 🌿" description={`${recoveryApplication.role} at ${recoveryApplication.company} has ended. You do not have to turn this into a lesson immediately.`} onClose={() => setRecoveryApplication(null)}>
          <form className="space-y-5" onSubmit={submitRecovery}>
            <div className="reset-message"><span className="text-3xl">🫶</span><div><p className="font-semibold text-emerald-100">This one process does not measure your professional value.</p><p className="mt-1 text-sm leading-6 text-slate-300">You can pause here, reflect only if it helps, or choose one small action. There is no correct response.</p></div></div>
            <fieldset><legend className="text-sm font-semibold text-slate-200">What would feel most useful right now?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{([
              ["I need a moment", "🌙", "Pause without adding pressure"],
              ["Help me learn", "🔍", "Keep useful lessons, not blame"],
              ["Help me close the loop", "💌", "Send a gracious final message"],
              ["Help me move forward", "🌱", "Choose one manageable action"],
            ] as [RecoveryNeed, string, string][]).map(([need, emoji, detail]) => <button aria-pressed={recoveryNeed === need} className={`recovery-choice ${recoveryNeed === need ? "recovery-choice-active" : ""}`} key={need} onClick={() => setRecoveryNeed(need)} type="button"><span className="text-2xl">{emoji}</span><span><strong className="block text-sm text-slate-100">{need}</strong><span className="mt-1 block text-xs text-slate-400">{detail}</span></span></button>)}</div></fieldset>
            {recoveryNeed === "I need a moment" ? <div className="rounded-2xl border border-indigo-400/15 bg-indigo-400/5 p-5 text-center"><span className="text-4xl">🌙</span><p className="mt-3 font-semibold">Pausing is a valid next step.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Carvio can hold the details. You do not need to solve the search today. Choose a gentle reminder below—or simply save this pause.</p></div> : <>
              <Field label="What worked well or felt stronger this time? (optional)"><textarea className="form-control min-h-20 resize-y" defaultValue={activeRecoveryEntry?.whatWorked} name="whatWorked" placeholder="A conversation, answer, connection, preparation step…" /></Field>
              <Field label="What would be useful to carry forward? (optional)"><textarea className="form-control min-h-20 resize-y" defaultValue={activeRecoveryEntry?.learning} name="learning" placeholder="One learning—not a judgment about yourself" /></Field>
              <Field label="What was outside your control? (optional)"><textarea className="form-control min-h-20 resize-y" defaultValue={activeRecoveryEntry?.outsideControl} name="outsideControl" placeholder="Internal candidate, changed budget, timing, team decision…" /></Field>
            </>}
            {recoveryNeed === "Help me close the loop" && <button className="secondary-button w-full border-pink-400/20 bg-pink-400/5" onClick={() => { setMessageProfile({ ...emptyMessageProfile, recipientType: "Recruiter", intent: "Thank them", tone: "Warm & professional", company: recoveryApplication.company, role: recoveryApplication.role }); setGeneratedMessage(""); setRecoveryApplication(null); window.setTimeout(() => document.getElementById("message-studio")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }} type="button">💌 Open a thank-you message in Message Studio</button>}
            <Field label="One gentle next step"><input className="form-control" defaultValue={activeRecoveryEntry?.nextAction} name="nextAction" placeholder={recoveryNeed === "I need a moment" ? "e.g. Return to Carvio tomorrow afternoon" : "e.g. Send one thank-you note, then stop for today"} /></Field>
            <div className="rounded-xl bg-white/[0.03] p-3 text-xs leading-5 text-slate-500">If the feelings become overwhelming or extend beyond the job search, consider speaking with someone you trust or a qualified professional. Carvio is here to support reflection, not replace human care.</div>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setRecoveryApplication(null)} type="button">Not now</button><button className="primary-button bg-emerald-500 hover:bg-emerald-400" type="submit"><HeartHandshake className="h-4 w-4" /> Save my reset</button></div>
          </form>
        </Modal>
      )}

      {showFeedbackModal && (
        <Modal title="Carvio Pilot Feedback 🧪" description="Eight focused questions. Be candid—the founders are using this feedback to decide what to improve next." onClose={() => setShowFeedbackModal(false)} wide>
          <form className="space-y-4" onSubmit={submitFeedback}>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-sm leading-6 text-slate-300">Rate each item from <strong className="text-white">1 — needs major improvement</strong> to <strong className="text-white">5 — excellent</strong>. Every written comment is optional but extremely useful.</div>
            <div className="grid gap-4 lg:grid-cols-2">{pilotQuestions.map((question, index) => <fieldset className="feedback-question" key={question}><legend className="text-sm font-semibold leading-6 text-slate-100"><span className="mr-2 text-amber-300">{index + 1}.</span>{question}</legend><div className="mt-3 grid grid-cols-5 gap-1.5">{[1, 2, 3, 4, 5].map((score) => <label className="feedback-score" key={score}><input className="peer sr-only" defaultChecked={score === 4} name={`score-${index}`} required type="radio" value={score} /><span className="feedback-score-face">{score === 1 ? "😞" : score === 2 ? "😕" : score === 3 ? "😐" : score === 4 ? "🙂" : "🤩"}</span><span className="text-xs">{score}</span></label>)}</div><textarea aria-label={`Additional comment for: ${question}`} className="form-control mt-3 min-h-20 resize-y" name={`comment-${index}`} placeholder="Optional: tell us why you chose this score…" /></fieldset>)}</div>
            <Field label="9. Anything else you want the founders to know?"><textarea className="form-control min-h-32 resize-y" name="openFeedback" placeholder="Tell us anything about the product, interface, features, search quality, emotions, frustrations, or ideas. Nothing is too small." /></Field>
            <p className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm leading-6 text-slate-300">Press the button below and Carvio will open Gmail with every answer already addressed to the founders. You only need to press <strong className="text-white">Send</strong>. A backup is also saved in this browser.</p>
            {feedbackError && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200" role="alert">{feedbackError}</p>}
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowFeedbackModal(false)} type="button">Maybe later</button><button className="primary-button bg-amber-400 hover:bg-amber-300" type="submit"><Send className="h-4 w-4" /> Open feedback in Gmail</button></div>
          </form>
        </Modal>
      )}
    </main>
  );
}

function EmptyState({ icon, title, text, action, onAction }: { icon: ReactNode; title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_60%)] px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-300 shadow-lg shadow-cyan-950/30">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{text}</p>
      <button className="primary-button mt-5" onClick={onAction} type="button"><Plus className="h-4 w-4" />{action}</button>
    </div>
  );
}

function TrafficLightPicker({ label, value, onChange }: { label: string; value: TrafficLight; onChange: (value: TrafficLight) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-200">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {trafficLights.map((trafficLight) => {
          const meta = trafficLightMeta[trafficLight];
          return <button aria-pressed={value === trafficLight} className={`traffic-option ${value === trafficLight ? "border-cyan-400/50 bg-cyan-400/10 text-white" : "border-white/10 bg-slate-950/50 text-slate-400"}`} key={trafficLight} onClick={() => onChange(trafficLight)} type="button"><span className={`h-3 w-3 rounded-full ring-2 ring-white/10 ${meta.dot}`} />{meta.label}</button>;
        })}
      </div>
    </fieldset>
  );
}

function AnalyticsCard({ title, subtitle, icon, insight, recommendation, children }: { title: string; subtitle: string; icon: ReactNode; insight: string; recommendation: string; children: ReactNode }) {
  return (
    <article className="analytics-card">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-100">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><div className="rounded-xl bg-violet-400/10 p-2.5 text-violet-300">{icon}</div></div>
      <div className="mt-5 min-h-48">{children}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="insight-box"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300"><Lightbulb className="h-4 w-4" /> Insight</p><p className="mt-2 text-sm leading-6 text-slate-300">{insight}</p></div><div className="recommendation-box"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300"><Target className="h-4 w-4" /> Recommendation</p><p className="mt-2 text-sm leading-6 text-slate-300">{recommendation}</p></div></div>
    </article>
  );
}

function BarRows({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (!data.length) return <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">More data will appear here as you use Carvio.</div>;
  return <div className="space-y-3">{data.map((item, index) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-400">{item.label}</span><strong className="text-slate-200">{item.value}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: colors[index % colors.length], width: `${item.value ? Math.max(8, item.value / max * 100) : 0}%` }} /></div></div>)}</div>;
}

function SalaryBars({ data }: { data: { label: string; value: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (!data.length) return <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center"><span className="text-4xl">💸</span><p className="mt-3 text-sm text-slate-500">Salary insights will appear after expectations are added.</p></div>;
  return <div className="space-y-4">{data.map((item, index) => <div key={item.label}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm text-slate-400">{item.label} · {item.count} {item.count === 1 ? "role" : "roles"}</span><strong className="text-sm text-emerald-300">{compactMoney(item.value, item.label)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-700" style={{ opacity: 1 - index * 0.12, width: `${Math.max(10, item.value / max * 100)}%` }} /></div></div>)}</div>;
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = total ? data.map((item) => { const start = cursor; cursor += item.value / total * 100; return `${item.color} ${start}% ${cursor}%`; }).join(", ") : "#1e293b 0 100%";
  return <div className="flex min-h-48 flex-col items-center justify-center gap-5 sm:flex-row"><div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}><div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-slate-950"><strong className="text-3xl text-white">{total}</strong><span className="text-xs text-slate-500">colored signals</span></div></div><div className="w-full space-y-3">{data.map((item) => <div className="flex items-center justify-between gap-4" key={item.label}><span className="flex items-center gap-2 text-sm text-slate-400"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong className="text-sm text-slate-200">{item.value}</strong></div>)}</div></div>;
}
