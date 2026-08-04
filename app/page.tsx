"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, Fragment, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  CalendarPlus,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
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
  House,
  Lightbulb,
  Link as LinkIcon,
  Languages,
  LoaderCircle,
  Mail,
  MapPin,
  Menu,
  MessageCircleMore,
  MessagesSquare,
  Pencil,
  Palette,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Moon,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users2,
  X,
  Zap,
  WandSparkles,
  Wrench,
} from "lucide-react";

const APPLICATIONS_KEY = "carvio.applications.v1";
const CONTACTS_KEY = "carvio.contacts.v1";
const FEEDBACK_KEY = "carvio.feedback.v1";
const RESUMES_KEY = "carvio.resumes.v1";
const SEARCH_PROFILE_KEY = "carvio.search-profile.v1";
const RECOVERY_KEY = "carvio.recovery.v1";
const THEME_KEY = "carvio.theme.v1";
const THEME_EXPLICIT_KEY = "carvio.theme-explicit.v1";
const PROFILE_KEY = "carvio.profile.v1";
const CHECKIN_KEY = "carvio.checkin.v1";
const LANGUAGE_KEY = "carvio.language.v1";
const LANDING_KEY = "carvio.landing-seen.v1";
const ANALYTICS_SAMPLE_PACK_KEY = "carvio.analytics-sample-pack.v1";

const applicationStatuses = [
  "Applied",
  "Interview",
  "Offer",
  "Follow-up due",
  "Rejected",
  "Withdrawn",
] as const;

type ApplicationStatus = (typeof applicationStatuses)[number];
type ApplicationMeetingFilter = "all" | "upcoming" | "past" | "unscheduled";
type ApplicationSort =
  | "meeting-soonest"
  | "meeting-latest"
  | "applied-newest"
  | "applied-oldest"
  | "company-az"
  | "role-az"
  | "stage"
  | "priority";
type ContactMeetingFilter = "all" | "upcoming" | "past" | "unscheduled";
type ContactSort = "next-action" | "meeting-soonest" | "recent-contact" | "name-az" | "company-az" | "health";

const trafficLights = ["none", "green", "yellow", "red"] as const;
type TrafficLight = (typeof trafficLights)[number];
type AppView = "home" | "search" | "applications" | "networking" | "tools" | "more";
type ApplicationViewMode = "table" | "kanban" | "calendar";
type ProcessStage = { id: string; name: string; date: string; trafficLight: TrafficLight };

const workModels = ["", "Remote", "Hybrid", "On-site"] as const;
const priorities = ["Low", "Medium", "High"] as const;

type Application = {
  id: string;
  company: string;
  companyWebsite: string;
  logoUrl: string;
  role: string;
  status: ApplicationStatus;
  trafficLight: TrafficLight;
  source: string;
  location: string;
  country: string;
  workModel: (typeof workModels)[number];
  priority: (typeof priorities)[number];
  appliedDate: string;
  contactName: string;
  jobUrl: string;
  salary: string;
  budgetRange: string;
  salaryCurrency: "ILS" | "USD" | "EUR" | "GBP" | "Other";
  nextStep: string;
  nextStepDue: string;
  eventType: string;
  eventDateTime: string;
  processStages: ProcessStage[];
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

type UserProfile = {
  name: string;
  avatarDataUrl: string;
  targetRole: string;
  location: string;
  seniority: string;
  weeklyGoal: string;
  challenge: "Applications" | "Networking" | "CV" | "Interviews";
  completed: boolean;
};

type DailyMood = "" | "ready" | "low" | "difficult";
type JobInboxItem = {
  id: string;
  company: string;
  role: string;
  location: string;
  source: string;
  url: string;
  match: number;
  posted: string;
  reason: string;
};
type Language = "en" | "he";
type ColorTheme = "dark" | "light" | "ocean" | "plum";
type SocialPlatform = "LinkedIn" | "Instagram" | "Facebook";
type PostProfile = {
  platform: SocialPlatform;
  topic: string;
  audience: string;
  goal: "Share expertise" | "Tell a story" | "Start a conversation" | "Celebrate a milestone" | "Job-search visibility";
  tone: "Thoughtful" | "Bold" | "Warm" | "Practical" | "Inspirational";
  length: "Short" | "Medium" | "Long";
  keyPoint: string;
  callToAction: string;
};

const emptyUserProfile: UserProfile = { name: "", avatarDataUrl: "", targetRole: "", location: "", seniority: "", weeklyGoal: "5", challenge: "Applications", completed: false };
const emptyPostProfile: PostProfile = { platform: "LinkedIn", topic: "", audience: "", goal: "Share expertise", tone: "Thoughtful", length: "Medium", keyPoint: "", callToAction: "" };

const uiCopy = {
  en: {
    careerTag: "Career tracking, reimagined", welcome: "Welcome back", hero: "Let’s move your search forward.", heroBody: "One clear next step at a time—across every application and conversation.",
    overview: "Overview", applications: "Applications", networking: "Networking", tools: "Tools", insights: "Insights", reset: "Reset", studio: "Message Studio", posts: "Post Studio", cv: "CV Lab", search: "Job Search", analytics: "Analytics",
    light: "Light mode", dark: "Dark mode", saved: "Saved on this device", resetDemo: "Reset demo data", feedback: "Send feedback", hebrew: "עברית",
    checkin: "Daily check-in", arriving: "How are you arriving today?", adapt: "Carvio will adapt the size and tone of your next step.",
    todayFocus: "Today’s focus", careerTools: "Career tools", support: "Insights & support",
    applicationIntro: "Focus on one opportunity at a time.", networkingIntro: "Keep warm relationships moving naturally.", toolsIntro: "Open only the tool you need right now.", supportIntro: "Understand your search, reset after setbacks, and personalize Carvio.",
    ready: "Ready to move", low: "Low energy", difficult: "This feels difficult",
    applicationsEyebrow: "Job applications", activeOpportunities: "Active opportunities", addApplication: "Add application", networkingTitle: "Warm connections", addContact: "Add contact",
    nextBestAction: "Next Best Action", nextMoves: "The moves most likely to create momentum", prioritized: "Prioritized from your data",
    reflection: "Your reflection space", whatHelps: "What would help right now?", destination: "Choose a clear destination—no guessing, no endless settings list.",
    preferences: "Preferences", preferencesTitle: "Make Carvio feel right for you", appearance: "Appearance", appearanceHelp: "Light, dark and color themes", language: "Language", privacy: "Data & privacy", privacyHelp: "Backup, restore or delete data", pilotFeedback: "Pilot feedback", pilotFeedbackHelp: "Help shape the next version",
    cleanLight: "Clean light", darkForest: "Dark forest", deepOcean: "Deep ocean", warmPlum: "Warm plum", choosePalette: "Choose a palette",
    pilotQuestion: "Using the Carvio pilot?", pilotHelp: "Your honest feedback helps us improve what matters—not add more noise.", shareFeedback: "Share feedback",
  },
  he: {
    careerTag: "ניהול קריירה, בדרך חדשה", welcome: "שמחים שחזרת", hero: "בואו נקדם את חיפוש העבודה שלך.", heroBody: "צעד ברור אחד בכל פעם—בכל מועמדות ובכל שיחה.",
    overview: "סקירה", applications: "מועמדויות", networking: "נטוורקינג", tools: "כלים", insights: "תובנות", reset: "איזון מחדש", studio: "סטודיו הודעות", posts: "סטודיו פוסטים", cv: "מעבדת קורות חיים", search: "חיפוש משרות", analytics: "ניתוחים",
    light: "מצב בהיר", dark: "מצב כהה", saved: "נשמר במכשיר", resetDemo: "איפוס נתוני הדגמה", feedback: "שליחת משוב", hebrew: "English",
    checkin: "בדיקה יומית", arriving: "איך הגעת לכאן היום?", adapt: "Carvio יתאים את הצעד הבא לאנרגיה ולמצב שלך.",
    todayFocus: "המיקוד להיום", careerTools: "כלי קריירה", support: "תובנות ותמיכה",
    applicationIntro: "להתמקד בכל הזדמנות בנפרד.", networkingIntro: "לשמור על קשרים חמים ולהניע אותם בטבעיות.", toolsIntro: "לפתוח רק את הכלי שנחוץ לך עכשיו.", supportIntro: "להבין את החיפוש, להתאושש מאכזבות ולהתאים את Carvio אליך.",
    ready: "מוכן להתקדם", low: "מעט אנרגיה", difficult: "זה מרגיש קשה",
    applicationsEyebrow: "מועמדויות לעבודה", activeOpportunities: "הזדמנויות פעילות", addApplication: "הוספת מועמדות", networkingTitle: "קשרים חמים", addContact: "הוספת איש קשר",
    nextBestAction: "הפעולה המומלצת הבאה", nextMoves: "הצעדים שסביר ביותר שייצרו תנופה", prioritized: "מתועדף לפי הנתונים שלך",
    reflection: "מרחב להתבוננות", whatHelps: "מה יעזור לך עכשיו?", destination: "בחרו יעד ברור—בלי לנחש ובלי רשימת הגדרות אינסופית.",
    preferences: "העדפות", preferencesTitle: "להתאים את Carvio אליך", appearance: "תצוגה", appearanceHelp: "מצב בהיר, כהה וערכות צבעים", language: "שפה", privacy: "מידע ופרטיות", privacyHelp: "גיבוי, שחזור או מחיקת מידע", pilotFeedback: "משוב על הפיילוט", pilotFeedbackHelp: "עזרו לנו לעצב את הגרסה הבאה",
    cleanLight: "בהיר ונקי", darkForest: "יער כהה", deepOcean: "אוקיינוס עמוק", warmPlum: "שזיף חם", choosePalette: "בחירת ערכת צבעים",
    pilotQuestion: "משתמשים בפיילוט של Carvio?", pilotHelp: "המשוב הכנה שלכם עוזר לנו לשפר את מה שחשוב—בלי להוסיף עומס.", shareFeedback: "שיתוף משוב",
  },
} as const;

type ApplicationDraft = Omit<Application, "id">;
type ContactDraft = Omit<Contact, "id">;

const emptySearchProfile: SearchProfile = { role: "", location: "", country: "Netherlands", radius: "25", skills: "", seniority: "", workModel: "", employmentType: "Full-time", datePosted: "Past 24 hours", industry: "", exclude: "" };

const skillSuggestions = ["Business partnering", "Talent management", "Employee relations", "Organizational development", "Change management", "Workforce planning", "Coaching", "HR analytics", "People strategy", "Recruitment", "Compensation & benefits", "Labor law", "Stakeholder management", "Leadership development", "Performance management"];
const roleSuggestions = ["Supply Chain Manager", "Operations Manager", "Procurement Manager", "Logistics Manager", "HR Business Partner", "Senior HR Business Partner", "People Partner", "HR Manager", "People Operations Manager", "Talent Acquisition Partner", "Organizational Development Manager", "Employee Experience Manager"];
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
  companyWebsite: "",
  logoUrl: "",
  role: "",
  status: "Applied",
  trafficLight: "none",
  source: "",
  location: "",
  country: "",
  workModel: "",
  priority: "Medium",
  appliedDate: "",
  contactName: "",
  jobUrl: "",
  salary: "",
  budgetRange: "",
  salaryCurrency: "ILS",
  nextStep: "",
  nextStepDue: "",
  eventType: "Interview",
  eventDateTime: "",
  processStages: [],
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

const demoApplications: Partial<Application>[] = [
  {
    id: "demo-app-1",
    company: "Northstar Labs",
    companyWebsite: "",
    logoUrl: "",
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
    companyWebsite: "",
    logoUrl: "",
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
    companyWebsite: "",
    logoUrl: "",
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
  {
    id: "demo-app-4",
    company: "Canva",
    companyWebsite: "https://www.canva.com",
    logoUrl: "",
    role: "Lead Product Designer",
    status: "Interview",
    trafficLight: "green",
    source: "Recruiter",
    location: "Amsterdam",
    country: "Netherlands",
    workModel: "Hybrid",
    priority: "High",
    appliedDate: "2026-07-21",
    contactName: "Sophie van Dijk",
    jobUrl: "https://www.canva.com/careers/",
    salary: "85000",
    budgetRange: "€80,000–€92,000 annually",
    salaryCurrency: "EUR",
    nextStep: "Prepare a product strategy case study",
    nextStepDue: "2026-07-29",
    eventType: "Hiring manager interview",
    eventDateTime: "2026-07-30T11:00",
    processStages: [
      { id: "demo-app-4-stage-1", name: "Application submitted", date: "2026-07-21", trafficLight: "green" },
      { id: "demo-app-4-stage-2", name: "Recruiter call", date: "2026-07-24", trafficLight: "green" },
      { id: "demo-app-4-stage-3", name: "Hiring manager interview", date: "2026-07-30", trafficLight: "yellow" },
    ],
    notes: "Strong culture fit. Prepare examples of design leadership across distributed teams.",
  },
  {
    id: "demo-app-5",
    company: "Booking.com",
    companyWebsite: "https://www.booking.com",
    logoUrl: "",
    role: "Design Manager",
    status: "Follow-up due",
    trafficLight: "yellow",
    source: "LinkedIn",
    location: "Amsterdam",
    country: "Netherlands",
    workModel: "Hybrid",
    priority: "High",
    appliedDate: "2026-07-12",
    contactName: "Daniel Rossi",
    jobUrl: "https://jobs.booking.com/",
    salary: "98000",
    budgetRange: "€95,000–€110,000 annually",
    salaryCurrency: "EUR",
    nextStep: "Send a concise follow-up to the recruiter",
    nextStepDue: "2026-07-27",
    eventType: "Recruiter screen",
    eventDateTime: "2026-07-20T09:30",
    processStages: [
      { id: "demo-app-5-stage-1", name: "Application submitted", date: "2026-07-12", trafficLight: "green" },
      { id: "demo-app-5-stage-2", name: "Recruiter screen", date: "2026-07-20", trafficLight: "green" },
      { id: "demo-app-5-stage-3", name: "Hiring manager review", date: "2026-07-24", trafficLight: "yellow" },
    ],
    notes: "Recruiter said the team would respond within five business days.",
  },
  {
    id: "demo-app-6",
    company: "Miro",
    companyWebsite: "https://miro.com",
    logoUrl: "",
    role: "Principal UX Designer",
    status: "Offer",
    trafficLight: "green",
    source: "Referral",
    location: "Berlin",
    country: "Germany",
    workModel: "Remote",
    priority: "High",
    appliedDate: "2026-06-18",
    contactName: "Lea Schneider",
    jobUrl: "https://miro.com/careers/",
    salary: "105000",
    budgetRange: "€100,000–€112,000 annually plus equity",
    salaryCurrency: "EUR",
    nextStep: "Review the offer and prepare negotiation questions",
    nextStepDue: "2026-07-28",
    eventType: "Offer conversation",
    eventDateTime: "2026-07-28T15:00",
    processStages: [
      { id: "demo-app-6-stage-1", name: "Recruiter call", date: "2026-06-23", trafficLight: "green" },
      { id: "demo-app-6-stage-2", name: "Portfolio interview", date: "2026-07-02", trafficLight: "green" },
      { id: "demo-app-6-stage-3", name: "Panel interview", date: "2026-07-14", trafficLight: "green" },
      { id: "demo-app-6-stage-4", name: "Offer", date: "2026-07-26", trafficLight: "green" },
    ],
    notes: "Offer is compelling. Clarify equity terms, learning budget, and travel expectations.",
  },
  {
    id: "demo-app-7",
    company: "Spotify",
    companyWebsite: "https://www.spotify.com",
    logoUrl: "",
    role: "Senior Product Designer",
    status: "Rejected",
    trafficLight: "red",
    source: "Company careers page",
    location: "Stockholm",
    country: "Sweden",
    workModel: "Hybrid",
    priority: "Medium",
    appliedDate: "2026-06-05",
    contactName: "Emma Lind",
    jobUrl: "https://www.lifeatspotify.com/jobs",
    salary: "90000",
    budgetRange: "SEK 900,000–1,050,000 annually",
    salaryCurrency: "Other",
    nextStep: "Capture interview learning and close the loop",
    nextStepDue: "2026-07-22",
    eventType: "Final interview",
    eventDateTime: "2026-07-15T13:00",
    processStages: [
      { id: "demo-app-7-stage-1", name: "Initial screen", date: "2026-06-12", trafficLight: "green" },
      { id: "demo-app-7-stage-2", name: "Portfolio review", date: "2026-06-25", trafficLight: "green" },
      { id: "demo-app-7-stage-3", name: "Final interview", date: "2026-07-15", trafficLight: "red" },
    ],
    notes: "Positive feedback on craft; the selected candidate had deeper marketplace experience.",
  },
  {
    id: "demo-app-8",
    company: "Adyen",
    companyWebsite: "https://www.adyen.com",
    logoUrl: "",
    role: "Product Design Lead",
    status: "Applied",
    trafficLight: "none",
    source: "Networking",
    location: "Amsterdam",
    country: "Netherlands",
    workModel: "On-site",
    priority: "Medium",
    appliedDate: "2026-07-26",
    contactName: "Noah de Boer",
    jobUrl: "https://careers.adyen.com/",
    salary: "92000",
    budgetRange: "Not shared",
    salaryCurrency: "EUR",
    nextStep: "Ask Noah for context about the design organization",
    nextStepDue: "2026-07-31",
    eventType: "Informational interview",
    eventDateTime: "2026-08-01T10:30",
    processStages: [
      { id: "demo-app-8-stage-1", name: "Application submitted", date: "2026-07-26", trafficLight: "none" },
    ],
    notes: "Warm introduction through a former colleague. Role emphasizes complex B2B workflows.",
  },
  {
    id: "demo-app-9",
    company: "Personio",
    companyWebsite: "https://www.personio.com",
    logoUrl: "",
    role: "Staff Product Designer",
    status: "Withdrawn",
    trafficLight: "red",
    source: "Indeed",
    location: "Munich",
    country: "Germany",
    workModel: "Hybrid",
    priority: "Low",
    appliedDate: "2026-05-19",
    contactName: "Lukas Weber",
    jobUrl: "https://www.personio.com/about-personio/careers/",
    salary: "88000",
    budgetRange: "€82,000–€90,000 annually",
    salaryCurrency: "EUR",
    nextStep: "Archive the opportunity",
    nextStepDue: "2026-06-30",
    eventType: "Hiring manager interview",
    eventDateTime: "2026-06-10T16:00",
    processStages: [
      { id: "demo-app-9-stage-1", name: "Recruiter call", date: "2026-05-27", trafficLight: "green" },
      { id: "demo-app-9-stage-2", name: "Hiring manager interview", date: "2026-06-10", trafficLight: "yellow" },
      { id: "demo-app-9-stage-3", name: "Candidate withdrew", date: "2026-06-18", trafficLight: "red" },
    ],
    notes: "Withdrew after learning that the required office schedule was not flexible enough.",
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
    processStages: Array.isArray(value.processStages) ? value.processStages.map((stage) => ({
      id: stage.id || makeId("stage"),
      name: stage.name || "",
      date: stage.date || "",
      trafficLight: trafficLights.includes(stage.trafficLight as TrafficLight) ? stage.trafficLight : "none",
    })) : [],
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

function landingVisibleForUrl(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("welcome") === "1") return true;
  return params.get("workspace") !== "1";
}

function formatDate(value: string, includeTime = false) {
  if (!value) return "";
  const date = new Date(includeTime ? value : `${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function calendarDates(value: string) {
  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const start = new Date(value);
  const end = new Date(start.getTime() + (allDay ? 24 : 1) * 60 * 60 * 1000);
  const compact = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const compactDay = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");
  return { start, end, allDay, google: allDay ? `${compactDay(start)}/${compactDay(end)}` : `${compact(start)}/${compact(end)}`, icsStart: compact(start), icsEnd: compact(end), icsDayStart: compactDay(start), icsDayEnd: compactDay(end) };
}

function escapeICS(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function googleCalendarUrl(title: string, dateTime: string, details: string, location = "") {
  const dates = calendarDates(dateTime);
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: dates.google, details, location });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function outlookCalendarUrl(title: string, dateTime: string, details: string, location = "") {
  const dates = calendarDates(dateTime);
  const params = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: title, startdt: dates.start.toISOString(), enddt: dates.end.toISOString(), body: details, location, allday: String(dates.allDay) });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function calendarICS(title: string, dateTime: string, details: string, location = "") {
  const dates = calendarDates(dateTime);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Carvio//Career Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${makeId("carvio")}@carvio`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    dates.allDay ? `DTSTART;VALUE=DATE:${dates.icsDayStart}` : `DTSTART:${dates.icsStart}`,
    dates.allDay ? `DTEND;VALUE=DATE:${dates.icsDayEnd}` : `DTEND:${dates.icsEnd}`, `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(details)}`, `LOCATION:${escapeICS(location)}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

type ApplicationCalendarEvent = { title: string; dateTime: string; details: string; location: string; isPast: boolean; allDay: boolean; stageName: string };

function applicationCalendarEvent(application: Application, language: Language): ApplicationCalendarEvent | null {
  const meetingDate = application.eventDateTime && !Number.isNaN(Date.parse(application.eventDateTime)) ? application.eventDateTime : "";
  const meetingDay = meetingDate.slice(0, 10);
  const candidates = [
    ...(meetingDate ? [{ name: application.eventType || (language === "he" ? "פגישה בתהליך" : "Application meeting"), dateTime: meetingDate, allDay: false }] : []),
    ...application.processStages.filter((stage) => stage.date && stage.date !== meetingDay && !Number.isNaN(Date.parse(`${stage.date}T12:00:00`))).map((stage) => ({ name: stage.name || (language === "he" ? "שלב בתהליך" : "Application stage"), dateTime: stage.date, allDay: true })),
  ];
  if (!candidates.length) return null;
  const now = Date.now();
  const timestamp = (candidate: { dateTime: string; allDay: boolean }) => new Date(candidate.allDay ? `${candidate.dateTime}T23:59:59` : candidate.dateTime).getTime();
  const upcoming = candidates.filter((candidate) => timestamp(candidate) >= now).sort((a, b) => timestamp(a) - timestamp(b));
  const selected = upcoming[0] || candidates.sort((a, b) => timestamp(b) - timestamp(a))[0];
  const isPastEvent = timestamp(selected) < now;
  const title = language === "he" ? `${selected.name} · ${application.role} ב־${application.company}` : `${selected.name}: ${application.role} at ${application.company}`;
  const details = [
    `${language === "he" ? "חברה" : "Company"}: ${application.company}`,
    `${language === "he" ? "תפקיד" : "Role"}: ${application.role}`,
    `${language === "he" ? "שלב" : "Stage"}: ${selected.name}`,
    application.nextStep ? `${language === "he" ? "הצעד הבא" : "Next step"}: ${application.nextStep}` : "",
    application.notes,
    application.jobUrl ? `${language === "he" ? "קישור למשרה" : "Job link"}: ${application.jobUrl}` : "",
  ].filter(Boolean).join("\n");
  return { title, dateTime: selected.dateTime, details, location: application.location || "", isPast: isPastEvent, allDay: selected.allDay, stageName: selected.name };
}

function openGoogleCalendar(title: string, dateTime: string, details: string, location = "") {
  if (!dateTime) return;
  window.open(googleCalendarUrl(title, dateTime, details, location), "_blank", "noopener,noreferrer");
}

function downloadICS(title: string, dateTime: string, details: string, location = "") {
  if (!dateTime) return;
  const ics = calendarICS(title, dateTime, details, location);
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

async function extractResumeText(file: File) {
  const fileName = file.name.toLowerCase();
  if (file.type.startsWith("text/") || /\.(txt|md|rtf|csv)$/i.test(fileName)) {
    return (await file.text()).slice(0, 30000);
  }
  if (/\.docx$/i.test(fileName) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.slice(0, 30000);
  }
  if (/\.pdf$/i.test(fileName) || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 12); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    }
    return pages.join("\n\n").slice(0, 30000);
  }
  return "";
}

function normalizedSearchProfile(profile: SearchProfile) {
  const roleWithLocation = profile.role.match(/^(.+?)\s+in\s+([^,]+)$/i);
  const role = roleWithLocation && !profile.location.trim() ? roleWithLocation[1].trim() : profile.role.trim();
  const city = roleWithLocation && !profile.location.trim() ? roleWithLocation[2].trim() : profile.location.trim();
  const location = [city, profile.country].filter(Boolean).join(", ");
  return { ...profile, role, location, city };
}

function companyLogoFromWebsite(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=128`;
  } catch {
    return "";
  }
}

function companyJobSearchRoute(profile: SearchProfile, company: string, routeIndex = 0, officialCareerUrl = "") {
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
    distance: clean.radius,
    sortBy: "DD",
  });
  if (freshness) params.set("f_TPR", freshness);
  return {
    provider: `LinkedIn · ${company}`,
    url: `https://www.linkedin.com/jobs/search/?${params.toString()}`,
  };
}

function jobSearchSources(profile: SearchProfile) {
  const clean = normalizedSearchProfile(profile);
  // LinkedIn and Indeed already expose structured filters. Sending skills from a
  // previous search in the keywords field can overpower a newly entered role.
  const role = encodeURIComponent(clean.role);
  const location = encodeURIComponent(clean.location);
  const indeedDomains: Record<string, string> = { Netherlands: "nl.indeed.com", Israel: "il.indeed.com", "United Kingdom": "uk.indeed.com", Germany: "de.indeed.com", France: "fr.indeed.com", Spain: "es.indeed.com", Portugal: "pt.indeed.com", Belgium: "be.indeed.com", Canada: "ca.indeed.com", "United States": "www.indeed.com" };
  const googleDomains: Record<string, string> = { Netherlands: "www.google.nl", Israel: "www.google.co.il", "United Kingdom": "www.google.co.uk", Germany: "www.google.de", France: "www.google.fr", Spain: "www.google.es", Portugal: "www.google.pt", Belgium: "www.google.be", Canada: "www.google.ca", "United States": "www.google.com" };
  const countryCodes: Record<string, string> = { Netherlands: "nl", Israel: "il", "United Kingdom": "gb", Germany: "de", France: "fr", Spain: "es", Portugal: "pt", Belgium: "be", Canada: "ca", "United States": "us" };
  const indeedDomain = indeedDomains[clean.country] || "www.indeed.com";
  const googleDomain = googleDomains[clean.country] || "www.google.com";
  const strictLocalQuery = [`"${clean.role}"`, clean.city ? `"${clean.city}"` : "", `"${clean.country}"`, clean.skills ? clean.skills.split(",").map((skill) => `"${skill.trim()}"`).join(" ") : "", clean.seniority && clean.seniority !== "Any level" ? `"${clean.seniority}"` : "", clean.employmentType && clean.employmentType !== "Any type" ? `"${clean.employmentType}"` : "", clean.workModel && clean.workModel !== "Any model" ? `"${clean.workModel}"` : "", clean.exclude ? clean.exclude.split(",").map((term) => `-"${term.trim()}"`).join(" ") : ""].filter(Boolean).join(" ");
  const indeedAge = clean.datePosted === "Past 24 hours" ? "1" : clean.datePosted === "Past week" ? "7" : clean.datePosted === "Past month" ? "30" : "";
  const linkedInAge = clean.datePosted === "Past 24 hours" ? "r86400" : clean.datePosted === "Past week" ? "r604800" : clean.datePosted === "Past month" ? "r2592000" : "";
  const googleAge = clean.datePosted === "Past 24 hours" ? "qdr:d" : clean.datePosted === "Past week" ? "qdr:w" : clean.datePosted === "Past month" ? "qdr:m" : "";
  const linkedInParams = new URLSearchParams({
    keywords: clean.role,
    location: clean.location,
    distance: clean.radius,
    sortBy: "DD",
  });
  if (linkedInAge) linkedInParams.set("f_TPR", linkedInAge);
  const linkedInSeniority: Record<string, string> = { "Entry level": "2", Associate: "3", "Mid-Senior level": "4", Director: "5", Executive: "6" };
  const linkedInEmployment: Record<string, string> = { "Full-time": "F", "Part-time": "P", Contract: "C", Temporary: "T", Internship: "I" };
  const linkedInWorkModel: Record<string, string> = { "On-site": "1", Remote: "2", Hybrid: "3" };
  if (linkedInSeniority[clean.seniority]) linkedInParams.set("f_E", linkedInSeniority[clean.seniority]);
  if (linkedInEmployment[clean.employmentType]) linkedInParams.set("f_JT", linkedInEmployment[clean.employmentType]);
  if (linkedInWorkModel[clean.workModel]) linkedInParams.set("f_WT", linkedInWorkModel[clean.workModel]);
  const countryCode = countryCodes[clean.country] || clean.country.slice(0, 2).toLowerCase();
  const googleSuffix = `&hl=en&gl=${encodeURIComponent(countryCode)}${googleAge ? `&tbs=${googleAge}` : ""}`;
  const indeedEmployment: Record<string, string> = { "Full-time": "fulltime", "Part-time": "parttime", Contract: "contract", Temporary: "temporary", Internship: "internship" };
  const indeedJobType = indeedEmployment[clean.employmentType] ? `&jt=${indeedEmployment[clean.employmentType]}` : "";
  return [
    { name: "LinkedIn — newest", emoji: "💼", featured: true, freshness: `${clean.datePosted} · newest first`, accuracy: `${clean.city ? "City + country" : "Country"} + ${clean.radius} km`, description: `LinkedIn receives the exact role plus separate location, radius and freshness filters. If it says “No matching jobs,” ignore the unrelated recommendations shown underneath.`, url: `https://www.linkedin.com/jobs/search/?${linkedInParams.toString()}` },
    { name: "Indeed — local", emoji: "🌍", featured: false, freshness: clean.datePosted, accuracy: `${clean.radius} km location filter`, description: `${clean.employmentType || "All roles"} on the local ${clean.country} site, sorted by newest within the selected radius.`, url: `https://${indeedDomain}/jobs?q=${role}&l=${location}&radius=${encodeURIComponent(clean.radius)}${indeedAge ? `&fromage=${indeedAge}` : ""}${indeedJobType}&sort=date` },
    { name: "Google Jobs — precise", emoji: "🔎", featured: false, freshness: clean.datePosted, accuracy: clean.city ? "Exact city + country" : "Exact country", description: `Google Jobs search requiring the selected role and ${clean.city ? `${clean.city}, ` : ""}${clean.country}, plus the skills and work preferences you supplied.`, url: `https://${googleDomain}/search?q=${encodeURIComponent(`${strictLocalQuery} jobs`)}${googleSuffix}&ibp=htl;jobs#htivrt=jobs` },
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

function generateSocialPost(profile: PostProfile, language: Language) {
  const topic = profile.topic.trim() || (language === "he" ? "תובנה מקצועית שלמדתי לאחרונה" : "a professional lesson I learned recently");
  const audience = profile.audience.trim() || (language === "he" ? "אנשים בתחום שלי" : "people in my field");
  const point = profile.keyPoint.trim() || (language === "he" ? "התקדמות אמיתית מתחילה בצעד קטן ומדויק" : "real progress starts with one small, deliberate action");
  const cta = profile.callToAction.trim() || (language === "he" ? "מה הניסיון שלכם בנושא?" : "What has your experience been?");
  const hashtagSource = topic.split(/\s+/).filter((word) => word.length > 3).slice(0, 3).map((word) => `#${word.replace(/[^\p{L}\p{N}]/gu, "")}`).join(" ");
  const platformTag = profile.platform === "LinkedIn" ? "#CareerGrowth" : profile.platform === "Instagram" ? "#CareerJourney" : "#ProfessionalGrowth";
  const hook = language === "he"
    ? profile.tone === "Bold" ? `דעה שאולי לא כולם יסכימו איתה: ${point}.` : profile.tone === "Inspirational" ? `לפעמים שינוי גדול מתחיל ברגע קטן. ✨` : `לאחרונה אני חושב/ת הרבה על ${topic}.`
    : profile.tone === "Bold" ? `A view not everyone will agree with: ${point}.` : profile.tone === "Inspirational" ? "Sometimes a meaningful change begins with one small moment. ✨" : `I’ve been thinking a lot about ${topic}.`;
  const goalBridge = language === "he"
    ? ({
        "Share expertise": "הנה התובנה המקצועית שהפכה עבורי את הרעיון לפרקטיקה:",
        "Tell a story": "החוויה הזו לימדה אותי משהו שלא היה ברור לי בהתחלה:",
        "Start a conversation": "אני משתף/ת את זה לא כתשובה סופית, אלא כהזמנה לשיחה:",
        "Celebrate a milestone": "זה רגע ששווה לעצור, להעריך וללמוד ממנו:",
        "Job-search visibility": "המסר הזה משקף גם את סוג העשייה וההשפעה שאני רוצה להביא לתפקיד הבא:",
      } as Record<PostProfile["goal"], string>)[profile.goal]
    : ({
        "Share expertise": "Here is the professional insight that made the idea practical for me:",
        "Tell a story": "The experience taught me something I could not see clearly at first:",
        "Start a conversation": "I’m sharing this not as a final answer, but as an invitation to compare perspectives:",
        "Celebrate a milestone": "This is a moment worth pausing to appreciate—and learn from:",
        "Job-search visibility": "It also reflects the kind of work and impact I want to bring to my next role:",
      } as Record<PostProfile["goal"], string>)[profile.goal];
  const body = language === "he"
    ? `${goalBridge}\n\nמה שהבנתי הוא ש${point}.\n\nעבור ${audience}, זו לא רק תיאוריה—זו דרך לקבל החלטות טובות יותר, ללמוד תוך כדי תנועה ולבנות אמון לאורך זמן.`
    : `${goalBridge}\n\nWhat I keep coming back to is this: ${point}.\n\nFor ${audience}, this is more than an idea—it is a practical way to make better decisions, learn in motion, and build trust over time.`;
  const platformOpening = profile.platform === "Instagram" ? "📌 " : profile.platform === "Facebook" ? "💭 " : "";
  const extra = profile.length === "Long"
    ? (language === "he" ? `\n\nשלוש שאלות שכדאי לקחת מכאן:\n1. מה כבר עובד?\n2. מה אפשר לפשט?\n3. מהו הצעד הקטן הבא?` : `\n\nThree questions worth taking away:\n1. What is already working?\n2. What could be simplified?\n3. What is the next small step?`)
    : profile.length === "Short" ? "" : (language === "he" ? `\n\nהמטרה היא לא שלמות. המטרה היא תנועה עם כוונה.` : `\n\nThe goal is not perfection. The goal is intentional movement.`);
  return `${platformOpening}${hook}\n\n${body}${extra}\n\n${cta}\n\n${hashtagSource} ${platformTag}`.trim();
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
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`modal-dialog-shell w-full rounded-t-3xl border border-white/10 bg-slate-900 shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}
        role="dialog"
        ref={modalRef}
      >
        <div className="modal-dialog-header flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id={titleId}>{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-400" id={descriptionId}>{description}</p>}
          </div>
          <button aria-label="Close modal" className="icon-button" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="modal-dialog-body">{children}</div>
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

function ApplicationCalendarMenu({ application, language, onClose, onEdit }: { application: Application; language: Language; onClose: () => void; onEdit: () => void }) {
  const event = applicationCalendarEvent(application, language);
  return <div aria-label={language === "he" ? `אפשרויות יומן עבור ${application.role}` : `Calendar options for ${application.role}`} className="focus-calendar-menu application-calendar-menu" role="dialog">
    <div><CalendarClock className="h-5 w-5" /><span><strong>{event ? event.title : (language === "he" ? "לא נשמר מועד במועמדות הזו" : "No dated stage or meeting yet")}</strong><small>{event ? `${event.isPast ? (language === "he" ? "המועד האחרון שעבר · " : "Most recent past event · ") : ""}${formatDate(event.dateTime, !event.allDay)}` : (language === "he" ? "הוסיפו תאריך לשלב או תאריך ושעה לפגישה כדי ליצור אירוע מדויק." : "Add a stage date or meeting date and time to create an accurate event.")}</small></span></div>
    {event ? <div className="focus-calendar-options">
      <a href={googleCalendarUrl(event.title, event.dateTime, event.details, event.location)} onClick={onClose} rel="noreferrer" target="_blank"><CalendarPlus className="h-4 w-4" /><span><strong>Google Calendar</strong><small>{language === "he" ? "פתיחה ביומן Google" : "Open in Google Calendar"}</small></span><ArrowUpRight className="h-4 w-4" /></a>
      <a href={outlookCalendarUrl(event.title, event.dateTime, event.details, event.location)} onClick={onClose} rel="noreferrer" target="_blank"><CalendarPlus className="h-4 w-4" /><span><strong>Outlook Calendar</strong><small>{language === "he" ? "פתיחה ביומן Outlook באינטרנט" : "Open in Outlook on the web"}</small></span><ArrowUpRight className="h-4 w-4" /></a>
      <button onClick={() => { downloadICS(event.title, event.dateTime, event.details, event.location); onClose(); }} type="button"><Download className="h-4 w-4" /><span><strong>{language === "he" ? "הורדת קובץ ‎.ics" : "Download .ics"}</strong><small>{language === "he" ? "עבור Apple, Samsung ואפליקציות יומן" : "For Apple, Samsung, and calendar apps"}</small></span></button>
    </div> : <button className="focus-calendar-edit" onClick={onEdit} type="button"><Pencil className="h-4 w-4" />{language === "he" ? "עריכת המועמדות והוספת מועד" : "Edit application and add a date"}</button>}
  </div>;
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
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
  const [submittedSearchProfile, setSubmittedSearchProfile] = useState<SearchProfile | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [messageProfile, setMessageProfile] = useState<MessageProfile>(emptyMessageProfile);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [postProfile, setPostProfile] = useState<PostProfile>(emptyPostProfile);
  const [generatedPost, setGeneratedPost] = useState("");
  const [recoveryEntries, setRecoveryEntries] = useState<RecoveryEntry[]>([]);
  const [recoveryApplication, setRecoveryApplication] = useState<Application | null>(null);
  const [recoveryNeed, setRecoveryNeed] = useState<RecoveryNeed>("I need a moment");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<ColorTheme>("light");
  const [showAppearance, setShowAppearance] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [resumeProcessing, setResumeProcessing] = useState(false);
  const [expandedTools, setExpandedTools] = useState({ studio: false, social: false, cv: false, search: true, analytics: true });
  const [userProfile, setUserProfile] = useState<UserProfile>(emptyUserProfile);
  const [showTrustCenter, setShowTrustCenter] = useState(false);
  const [dailyMood, setDailyMood] = useState<DailyMood>("");
  const [activeView, setActiveView] = useState<AppView>("home");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [applicationQuery, setApplicationQuery] = useState("");
  const [applicationStageFilter, setApplicationStageFilter] = useState<"all" | ApplicationStatus>("all");
  const [applicationMeetingFilter, setApplicationMeetingFilter] = useState<ApplicationMeetingFilter>("all");
  const [applicationSort, setApplicationSort] = useState<ApplicationSort>("meeting-soonest");
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState("");
  const [contactHealthFilter, setContactHealthFilter] = useState<"all" | TrafficLight>("all");
  const [contactMeetingFilter, setContactMeetingFilter] = useState<ContactMeetingFilter>("all");
  const [contactSort, setContactSort] = useState<ContactSort>("next-action");
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [showApplicationFilters, setShowApplicationFilters] = useState(false);
  const [showContactFilters, setShowContactFilters] = useState(false);
  const [searchStep, setSearchStep] = useState<1 | 2 | 3>(1);
  const [mobileInsightCategory, setMobileInsightCategory] = useState<"pipeline" | "activity" | "networking">("pipeline");
  const [applicationViewMode, setApplicationViewMode] = useState<ApplicationViewMode>("table");
  const [showSmartCapture, setShowSmartCapture] = useState(false);
  const [smartCaptureUrl, setSmartCaptureUrl] = useState("");
  const [smartCaptureError, setSmartCaptureError] = useState("");
  const [workspaceApplicationId, setWorkspaceApplicationId] = useState<string | null>(null);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [activeCalendarMenu, setActiveCalendarMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCalendarMenu) return;
    const closeCalendarMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveCalendarMenu(null);
    };
    document.addEventListener("keydown", closeCalendarMenu);
    return () => document.removeEventListener("keydown", closeCalendarMenu);
  }, [activeCalendarMenu]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedApplications = readStored<Partial<Application>[]>(APPLICATIONS_KEY, demoApplications);
      const samplePackAlreadyAdded = window.localStorage.getItem(ANALYTICS_SAMPLE_PACK_KEY) === "added";
      const analyticsSamples = demoApplications.filter((application) =>
        ["demo-app-4", "demo-app-5", "demo-app-6", "demo-app-7", "demo-app-8", "demo-app-9"].includes(application.id ?? ""),
      );
      const existingApplicationIds = new Set(storedApplications.map((application) => application.id));
      const mergedApplications = samplePackAlreadyAdded
        ? storedApplications
        : [
            ...storedApplications,
            ...analyticsSamples.filter((application) => !existingApplicationIds.has(application.id)),
          ];

      if (!samplePackAlreadyAdded) {
        window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(mergedApplications));
        window.localStorage.setItem(ANALYTICS_SAMPLE_PACK_KEY, "added");
      }

      setApplications(mergedApplications.map(normalizeApplication));
      setContacts(readStored<(Partial<Contact> & { companyRole?: string })[]>(CONTACTS_KEY, demoContacts).map(normalizeContact));
      setResumes(readStored<ResumeFile[]>(RESUMES_KEY, []));
      setSearchProfile({ ...emptySearchProfile, ...readStored<Partial<SearchProfile>>(SEARCH_PROFILE_KEY, emptySearchProfile) });
      setRecoveryEntries(readStored<RecoveryEntry[]>(RECOVERY_KEY, []));
      const savedTheme = readStored<ColorTheme>(THEME_KEY, "light");
      const hasExplicitTheme = readStored<boolean>(THEME_EXPLICIT_KEY, false);
      const validTheme = (["light", "dark", "ocean", "plum"] as ColorTheme[]).includes(savedTheme);
      setTheme(hasExplicitTheme && validTheme ? savedTheme : "light");
      if (!hasExplicitTheme || !validTheme) window.localStorage.setItem(THEME_KEY, JSON.stringify("light"));
      setLanguage(readStored<Language>(LANGUAGE_KEY, "en"));
      const savedProfile = { ...emptyUserProfile, ...readStored<Partial<UserProfile>>(PROFILE_KEY, emptyUserProfile) };
      setUserProfile(savedProfile);
      const checkIn = readStored<{ date: string; mood: DailyMood }>(CHECKIN_KEY, { date: "", mood: "" });
      setDailyMood(checkIn.date === new Date().toISOString().slice(0, 10) ? checkIn.mood : "");
      window.localStorage.removeItem(LANDING_KEY);
      setShowLanding(landingVisibleForUrl(window.location.search));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      setShowLanding(landingVisibleForUrl(window.location.search));
      setShowAppearance(false);
      setShowMobileMore(false);
      setActiveCalendarMenu(null);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
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
    if (!hydrated) return;
    window.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    const isLight = theme === "light";
    const background = isLight ? "#ffffff" : "#08261f";
    document.documentElement.style.colorScheme = isLight ? "only light" : "dark";
    document.documentElement.style.setProperty("background", background, "important");
    document.documentElement.style.setProperty("background-color", background, "important");
    document.body.style.setProperty("background", background, "important");
    document.body.style.setProperty("background-color", background, "important");
    document.documentElement.classList.toggle("carvio-force-light", isLight);
    document.body.classList.toggle("carvio-force-light", isLight);
    document.documentElement.dataset.carvioTheme = theme;
    document.body.dataset.carvioTheme = theme;
    let colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (!colorScheme) {
      colorScheme = document.createElement("meta");
      colorScheme.name = "color-scheme";
      document.head.appendChild(colorScheme);
    }
    colorScheme.content = isLight ? "only light" : "dark light";
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      document.head.appendChild(themeColor);
    }
    themeColor.content = background;
  }, [theme, hydrated]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LANGUAGE_KEY, JSON.stringify(language));
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  }, [language, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile, hydrated]);

  useEffect(() => {
    if (hydrated && dailyMood) window.localStorage.setItem(CHECKIN_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), mood: dailyMood }));
  }, [dailyMood, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowCommandBar(true);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || target.matches("input, textarea, select") || showApplicationModal || showContactModal || showFeedbackModal || recoveryApplication) return;
      if (event.key.toLowerCase() === "a") openNewApplication();
      if (event.key.toLowerCase() === "c") openNewContact();
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  });

  const workspaceApplication = useMemo(
    () => applications.find((item) => item.id === workspaceApplicationId) || null,
    [applications, workspaceApplicationId],
  );

  const actionApplication = useMemo(
    () => applications.find((item) => item.status === "Follow-up due" || isPast(item.nextStepDue))
      || applications.find((item) => item.eventDateTime && new Date(item.eventDateTime).getTime() >= Date.now())
      || applications.find((item) => !["Rejected", "Withdrawn"].includes(item.status)),
    [applications],
  );

  const metrics = useMemo(() => {
    const activeStatuses: ApplicationStatus[] = ["Applied", "Interview", "Follow-up due"];
    return [
      { label: language === "he" ? "מועמדויות פעילות" : "Active applications", value: applications.filter((item) => activeStatuses.includes(item.status)).length, icon: BriefcaseBusiness },
      { label: language === "he" ? "בשלב ראיון" : "Interview stage", value: applications.filter((item) => item.status === "Interview").length, icon: CalendarClock },
      { label: language === "he" ? "הצעות עבודה" : "Offers", value: applications.filter((item) => item.status === "Offer").length, icon: CheckCircle2 },
      { label: language === "he" ? "אנשי קשר" : "Networking contacts", value: contacts.length, icon: Users2 },
      { label: language === "he" ? "פעולות המשך לביצוע" : "Follow-ups due", value: applications.filter((item) => item.status === "Follow-up due" || isPast(item.nextStepDue)).length + contacts.filter((item) => isPast(item.nextActionDue)).length, icon: CircleAlert },
    ];
  }, [applications, contacts, language]);

  const weeklyMomentum = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentApplications = applications.filter((item) => item.appliedDate && new Date(item.appliedDate).getTime() >= weekAgo).length;
    const recentConversations = contacts.filter((item) => item.lastContactDate && new Date(item.lastContactDate).getTime() >= weekAgo).length;
    const plannedMoves = applications.filter((item) => item.nextStep.trim() && item.nextStepDue && new Date(item.nextStepDue).getTime() >= now).length + contacts.filter((item) => item.nextAction.trim() && item.nextActionDue && new Date(item.nextActionDue).getTime() >= now).length;
    const total = recentApplications + recentConversations + plannedMoves;
    const goal = Math.max(1, Number(userProfile.weeklyGoal) || 5);
    return { recentApplications, recentConversations, plannedMoves, total, goal, progress: Math.min(100, (total / goal) * 100) };
  }, [applications, contacts, userProfile.weeklyGoal]);

  const todaySnapshot = useMemo(() => {
    const now = Date.now();
    const upcomingInterview = applications
      .filter((item) => item.eventDateTime && new Date(item.eventDateTime).getTime() >= now)
      .sort((a, b) => new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime())[0];
    const overdue = applications.filter((item) => item.status === "Follow-up due" || isPast(item.nextStepDue)).length
      + contacts.filter((item) => isPast(item.nextActionDue)).length;
    return { upcomingInterview, overdue };
  }, [applications, contacts]);

  const homepageAction = useMemo(() => {
    if (!actionApplication) return { title: language === "he" ? "להוסיף את ההזדמנות הבאה" : "Add your next opportunity", support: language === "he" ? "הוסיפו מועמדות כדי ש־Carvio יוכל להציע את הצעד הבא המדויק ביותר." : "Add an application so Carvio can recommend the most useful next step.", urgency: "", target: "applications" };
    const application = actionApplication;
    const savedAction = application.nextStep.trim();
    const isPreparation = /^prep(?:are|aration)?\b/i.test(savedAction) || (application.status === "Interview" && !savedAction);
    const isFollowUp = /follow[ -]?up|check (?:for|in)|reconnect|send (?:a )?(?:note|message)/i.test(savedAction) || application.status === "Follow-up due";
    const eventName = application.eventType && !/^interview$/i.test(application.eventType) ? application.eventType.toLowerCase() : "interview";
    const title = isPreparation
      ? (language === "he" ? `להתכונן ל${eventName === "interview" ? "ראיון" : application.eventType} לתפקיד ${application.role} ב־${application.company}` : `Prepare for your ${application.role} ${eventName} at ${application.company}`)
      : isFollowUp
        ? (language === "he" ? `לשלוח הודעת המשך בנוגע לתפקיד ${application.role} ב־${application.company}` : `Send a follow-up for your ${application.role} application at ${application.company}`)
        : savedAction.length > 12
          ? `${savedAction}${language === "he" ? ` · ${application.company}` : ` — ${application.company}`}`
          : (language === "he" ? `לקדם את המועמדות לתפקיד ${application.role} ב־${application.company}` : `Move your ${application.role} application at ${application.company} forward`);
    const support = isPreparation
      ? (language === "he" ? "עברו על דרישות התפקיד, בחרו שתי דוגמאות רלוונטיות והכינו שאלות לשיחה." : "Review the role, choose two relevant examples, and prepare your questions for the conversation.")
      : isFollowUp
        ? (language === "he" ? "שלחו הודעה קצרה ואישית שמזכירה את השיחה או המועמדות ומציעה צעד הבא ברור." : "Send a short, personal note that references the application and suggests a clear next step.")
        : (language === "he" ? `השלימו את הצעד השמור עבור ${application.company} ועדכנו את התהליך לאחר מכן.` : `Complete the saved next step for ${application.company}, then update the application.`);
    const dueValue = application.nextStepDue || application.eventDateTime;
    const urgency = dueValue
      ? (isPast(dueValue)
          ? (language === "he" ? `באיחור · היה מיועד ל־${formatDate(dueValue, Boolean(application.eventDateTime))}` : `Overdue · was due ${formatDate(dueValue, Boolean(application.eventDateTime))}`)
          : (language === "he" ? `לביצוע עד ${formatDate(dueValue, Boolean(application.eventDateTime))}` : `Due ${formatDate(dueValue, Boolean(application.eventDateTime))}`))
      : "";
    return { title, support, urgency, target: "applications" };
  }, [actionApplication, language]);

  const careerJourney = useMemo(() => {
    const interviewApplications = applications.filter((application) => application.status === "Interview" || application.processStages.some((stage) => /interview|ראיון|screen|portfolio|panel|שיחת סינון/i.test(stage.name)));
    const activeApplications = applications.filter((application) => !["Rejected", "Withdrawn"].includes(application.status));
    const blockedApplications = applications.filter((application) => application.status === "Rejected" || application.trafficLight === "red");
    const activeStation = applications.length === 0
      ? "applications"
      : actionApplication?.status === "Interview" || actionApplication?.processStages.some((stage) => /interview|ראיון|screen|portfolio|panel/i.test(stage.name))
        ? "interviews"
        : contacts.length === 0 && applications.length > 0
          ? "conversations"
          : "next";
    const sentence = applications.length === 0
      ? (language === "he" ? "התחילו בהזדמנות אחת — נוסיף יחד את המועמדות הראשונה." : "Start with one opportunity—add your first application.")
      : blockedApplications.length > 0 && activeApplications.length === 0
        ? (language === "he" ? "התוצאות אינן מגדירות אתכם. הצעד הבא יכול להיות קטן ובשליטתכם." : "Outcomes do not define you. Your next move can be small and within your control.")
        : interviewApplications.length > 0
          ? (language === "he"
              ? `${contacts.length} ${contacts.length === 1 ? "שיחה מקדמת" : "שיחות מקדמות"} אתכם לעבר ${interviewApplications.length} ${interviewApplications.length === 1 ? "ראיון" : "ראיונות"}. הצעד הבא: ${homepageAction.title}`
              : `${contacts.length} ${contacts.length === 1 ? "conversation is" : "conversations are"} moving you toward ${interviewApplications.length} ${interviewApplications.length === 1 ? "interview" : "interviews"}. Next: ${homepageAction.title}`)
          : (language === "he"
              ? `${activeApplications.length} ${activeApplications.length === 1 ? "מועמדות פעילה" : "מועמדויות פעילות"} נמצאות במסלול. הצעד הבא: ${homepageAction.title}`
              : `${activeApplications.length} active ${activeApplications.length === 1 ? "application is" : "applications are"} on your path. Next: ${homepageAction.title}`);
    return {
      activeStation,
      sentence,
      isEmpty: applications.length === 0,
      isRecovery: blockedApplications.length > 0 && activeApplications.length === 0,
      stations: [
        { id: "applications", label: language === "he" ? "מועמדויות" : "Applications", value: applications.length, Icon: BriefcaseBusiness },
        { id: "conversations", label: language === "he" ? "שיחות וקשרים" : "Conversations", value: contacts.length, Icon: MessagesSquare },
        { id: "interviews", label: language === "he" ? "ראיונות" : "Interviews", value: interviewApplications.length, Icon: CalendarClock },
        { id: "next", label: language === "he" ? "הצעד הבא" : "Next move", value: actionApplication ? 1 : 0, Icon: Target },
      ],
    };
  }, [actionApplication, applications, contacts.length, homepageAction.title, language]);


  function enterWorkspace() {
    window.history.pushState({ carvioView: "workspace" }, "", "/?workspace=1");
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectTheme(nextTheme: ColorTheme) {
    window.localStorage.setItem(THEME_EXPLICIT_KEY, JSON.stringify(true));
    setTheme(nextTheme);
  }

  function navigateToSection(target: string) {
    const tool = target === "message-studio" ? "studio" : target === "social-studio" ? "social" : target === "cv-lab" ? "cv" : target === "job-search" ? "search" : target === "analytics" ? "analytics" : null;
    const view: AppView = target === "job-search" ? "search" : target === "applications" ? "applications" : target === "networking" ? "networking" : tool && tool !== "analytics" ? "tools" : target === "dashboard" ? "home" : "more";
    setActiveView(view);
    if (tool) setExpandedTools((current) => ({ ...current, [tool]: true }));
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

  function switchView(view: AppView) {
    setShowMobileMore(false);
    setActiveView(view);
    if (view === "more") {
      setExpandedTools((current) => ({ ...current, analytics: true }));
      window.setTimeout(() => document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const insights = useMemo(() => {
    const result: { title: string; text: string; tone: string; metric: string; target: AppView; action: string }[] = [];
    const active = applications.filter((item) => !["Rejected", "Withdrawn"].includes(item.status));
    const missingNextSteps = active.filter((item) => !item.nextStep.trim()).length;
    const interviews = applications.filter((item) => item.status === "Interview").length;
    const followUps = applications.filter((item) => item.status === "Follow-up due").length;
    const statusCounts = applicationStatuses.map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));
    const largestGroup = statusCounts.sort((a, b) => b.count - a.count)[0];

    if (followUps > 0) result.push({ title: language === "he" ? "טפלו תחילה בפעולות ההמשך" : "Start with your follow-ups", text: language === "he" ? `${followUps} מועמדויות ממתינות לפעולה. הודעה קצרה ומדויקת יכולה להחזיר הזדמנות לתנועה.` : `${followUps} ${followUps === 1 ? "application is" : "applications are"} ready for action. A short, thoughtful message can restart momentum.`, tone: "bg-amber-400", metric: String(followUps), target: "applications", action: language === "he" ? "למועמדויות" : "Open applications" });
    if (missingNextSteps > 0) result.push({ title: language === "he" ? "הגדירו את הצעד הבא" : "Clarify the next step", text: language === "he" ? `ל־${missingNextSteps} מועמדויות פעילות אין פעולה ברורה. הגדירו אחת כדי שלא יישארו תהליכים באוויר.` : `${missingNextSteps} active ${missingNextSteps === 1 ? "application has" : "applications have"} no clear action. Add one so nothing stays in limbo.`, tone: "bg-sky-400", metric: String(missingNextSteps), target: "applications", action: language === "he" ? "הגדרת צעדים" : "Set next steps" });
    if (interviews > 0) result.push({ title: language === "he" ? "הכינו את הראיונות הקרובים" : "Prepare your interviews", text: language === "he" ? `${interviews} הזדמנויות נמצאות בשלב ראיון. רכזו סיפורים, שאלות ומחקר בכל מועמדות.` : `${interviews} ${interviews === 1 ? "opportunity is" : "opportunities are"} at interview stage. Keep stories, questions, and research with each role.`, tone: "bg-violet-400", metric: String(interviews), target: "applications", action: language === "he" ? "להכנה" : "Review interviews" });
    const offerCount = applications.filter((item) => item.status === "Offer").length;
    if (offerCount > 0) result.push({ title: language === "he" ? "יש הצעה שמחכה להחלטה" : "An offer needs a decision", text: language === "he" ? "רכזו תנאים, שאלות וסדרי עדיפויות לפני השיחה הבאה כדי לקבל החלטה בביטחון." : "Capture terms, questions, and priorities before the next conversation so you can decide with confidence.", tone: "bg-emerald-400", metric: String(offerCount), target: "applications", action: language === "he" ? "לצפייה בהצעה" : "Review the offer" });
    if (contacts.length < 3) result.push({ title: language === "he" ? "הרחיבו קשר אחד משמעותי" : "Add one meaningful connection", text: language === "he" ? `שמורים כרגע ${contacts.length} אנשי קשר. התחילו מאדם שקשור להזדמנות החשובה ביותר שלכם.` : `You have ${contacts.length} saved ${contacts.length === 1 ? "contact" : "contacts"}. Start with someone connected to your most important role.`, tone: "bg-fuchsia-400", metric: String(contacts.length), target: "networking", action: language === "he" ? "לנטוורקינג" : "Open networking" });
    if (applications.length >= 4 && largestGroup.count / applications.length >= 0.6) result.push({ title: language === "he" ? "שחררו את צוואר הבקבוק" : "Unblock the pipeline", text: language === "he" ? `${largestGroup.count} מתוך ${applications.length} מועמדויות נמצאות באותו שלב. בחרו את החזקה ביותר וקדמו אותה בפעולה אחת.` : `${largestGroup.count} of ${applications.length} applications share the “${largestGroup.status}” status. Choose the strongest and move it with one action.`, tone: "bg-rose-400", metric: `${largestGroup.count}/${applications.length}`, target: "applications", action: language === "he" ? "לבדיקת התהליך" : "Review pipeline" });
    if (result.length === 0) result.push({ title: language === "he" ? "התהליך בשליטה" : "Your search is under control", text: language === "he" ? "לכל מועמדות פעילה יש צעד הבא ואין כרגע פעולות המשך פתוחות. זה זמן טוב להתמקד באיכות." : "Every active application has a next step and no follow-ups are due. This is a good moment to focus on quality.", tone: "bg-emerald-400", metric: "✓", target: "applications", action: language === "he" ? "לצפייה בתהליך" : "View pipeline" });
    return result.slice(0, 4);
  }, [applications, contacts, language]);

  const todayFocus = useMemo(() => {
    if (dailyMood === "difficult") {
      const rejected = applications.find((item) => item.status === "Rejected");
      return rejected ? { eyebrow: language === "he" ? "יום עדין יותר" : "A gentler day", title: language === "he" ? "לקחת רגע של Carvio Reset, בלי להכריח אופטימיות" : "Take a Carvio Reset—without forcing positivity", detail: language === "he" ? `${rejected.role} ב־${rejected.company}` : `${rejected.role} at ${rejected.company}`, target: "carvio-reset" } : { eyebrow: language === "he" ? "יום עדין יותר" : "A gentler day", title: language === "he" ? "לבחור פעולה קטנה אחת, ואז לעצור" : "Choose one small action, then stop", detail: language === "he" ? "ההרגשה שלך חשובה יותר מסיום הרשימה." : "Your wellbeing matters more than clearing a list.", target: "applications" };
    }
    if (dailyMood === "low") {
      const smallStep = contacts.find((item) => item.nextAction.trim()) || null;
      return smallStep ? { eyebrow: language === "he" ? "צעד קטן אחד" : "One small move", title: smallStep.nextAction, detail: `${smallStep.name}${smallStep.company ? ` · ${smallStep.company}` : ""}`, target: "networking" } : { eyebrow: language === "he" ? "צעד קטן אחד" : "One small move", title: language === "he" ? "לעבור על הזדמנות פעילה אחת" : "Review one active opportunity", detail: language === "he" ? "חמש דקות ממוקדות הן התקדמות משמעותית." : "Five focused minutes is meaningful progress.", target: "applications" };
    }
    const followUp = applications.find((item) => item.status === "Follow-up due" || isPast(item.nextStepDue));
    if (followUp) return { eyebrow: language === "he" ? "פעולת המשך לביצוע" : "Follow-up due", title: followUp.nextStep || (language === "he" ? `לחזור אל ${followUp.company}` : `Follow up with ${followUp.company}`), detail: language === "he" ? `${followUp.role} ב־${followUp.company}` : `${followUp.role} at ${followUp.company}`, target: "applications" };
    const missingStep = applications.find((item) => !["Rejected", "Withdrawn"].includes(item.status) && !item.nextStep.trim());
    if (missingStep) return { eyebrow: language === "he" ? "נדרש צעד הבא" : "Needs a next step", title: language === "he" ? `לתכנן את הצעד הבא עבור ${missingStep.company}` : `Plan the next move for ${missingStep.company}`, detail: missingStep.role, target: "applications" };
    const interview = applications.find((item) => item.status === "Interview");
    if (interview) return { eyebrow: language === "he" ? "הכנה לראיון" : "Interview preparation", title: interview.nextStep || (language === "he" ? `להתכונן ל־${interview.company}` : `Prepare for ${interview.company}`), detail: language === "he" ? `${interview.role} ב־${interview.company}` : `${interview.role} at ${interview.company}`, target: "applications" };
    const contact = contacts.find((item) => item.nextAction.trim());
    if (contact) return { eyebrow: language === "he" ? "הצעד הבא בנטוורקינג" : "Networking next step", title: contact.nextAction, detail: `${contact.name} · ${contact.role}${contact.company ? (language === "he" ? ` ב־${contact.company}` : ` at ${contact.company}`) : ""}`, target: "networking" };
    return { eyebrow: language === "he" ? "מתחילים את היום" : "Start your day", title: language === "he" ? "להוסיף את ההזדמנות הבאה" : "Add your next opportunity", detail: language === "he" ? "תהליך ברור מתחיל ממועמדות אחת." : "A clear pipeline starts with one application.", target: "applications" };
  }, [applications, contacts, dailyMood, language]);

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
    const stageSignals = (["green", "yellow", "red", "none"] as TrafficLight[]).map((signal) => ({
      label: signal === "none" ? "No signal" : trafficLightMeta[signal].label,
      value: applications.flatMap((item) => item.processStages || []).filter((stage) => stage.trafficLight === signal).length,
    }));
    const now = Date.now();
    const applicationAge = [
      { label: "Added in the last 7 days", value: applications.filter((item) => item.appliedDate && now - new Date(item.appliedDate).getTime() <= 7 * 86400000).length },
      { label: "8–30 days", value: applications.filter((item) => item.appliedDate && now - new Date(item.appliedDate).getTime() > 7 * 86400000 && now - new Date(item.appliedDate).getTime() <= 30 * 86400000).length },
      { label: "More than 30 days", value: applications.filter((item) => item.appliedDate && now - new Date(item.appliedDate).getTime() > 30 * 86400000).length },
      { label: "Date not recorded", value: applications.filter((item) => !item.appliedDate).length },
    ];
    const eventReadiness = [
      { label: "Upcoming event", value: applications.filter((item) => item.eventDateTime && new Date(item.eventDateTime).getTime() >= now).length },
      { label: "Past event", value: applications.filter((item) => item.eventDateTime && new Date(item.eventDateTime).getTime() < now).length },
      { label: "No event scheduled", value: applications.filter((item) => !item.eventDateTime && !["Rejected", "Withdrawn"].includes(item.status)).length },
    ];
    const opportunityMatrix = applications.map((item) => {
      const reachedInterview = item.processStages.some((stage) => /interview|ראיון|screen|portfolio|panel/i.test(stage.name));
      const progression = item.status === "Offer"
        ? 4
        : item.status === "Interview" || reachedInterview
          ? 3
          : item.status === "Follow-up due"
            ? 2
            : 1;
      return {
        id: item.id,
        company: item.company,
        role: item.role,
        fit: item.priority === "High" ? 3 : item.priority === "Medium" ? 2 : 1,
        progression,
        priority: item.priority,
        trafficLight: item.trafficLight,
        status: item.status,
        overdue: isPast(item.nextStepDue),
      };
    });
    const highFitOpportunities = opportunityMatrix
      .filter((item) => item.fit === 3 && !["Rejected", "Withdrawn"].includes(item.status))
      .sort((a, b) => b.progression - a.progression);
    const highFitWaiting = highFitOpportunities.find((item) => item.trafficLight === "yellow" || item.overdue);
    const conversionFunnel = [
      { label: language === "he" ? "מועמדויות שתועדו" : "Tracked applications", value: applications.length },
      { label: language === "he" ? "הגיעו לראיון" : "Reached interview", value: applications.filter((item) => item.status === "Interview" || item.status === "Offer" || item.processStages.some((stage) => /interview|ראיון/i.test(stage.name))).length },
      { label: language === "he" ? "הצעות עבודה" : "Offers", value: applications.filter((item) => item.status === "Offer").length },
    ];
    return {
      pipeline,
      signals,
      sources,
      priorities: prioritiesData,
      workModels: workModelsData,
      networkingHealth,
      salaryGroups,
      stageSignals,
      applicationAge,
      eventReadiness,
      opportunityMatrix,
      highFitOpportunities,
      highFitWaiting,
      conversionFunnel,
      followUps: [{ label: "Overdue", value: appOverdue + contactOverdue }, { label: "Upcoming", value: upcoming }, { label: "No date", value: noDate }],
    };
  }, [applications, contacts, language]);

  const activeRecoveryEntry = recoveryApplication ? recoveryEntries.find((entry) => entry.applicationId === recoveryApplication.id) : undefined;
  const resolvedSearch = useMemo(() => normalizedSearchProfile(searchProfile), [searchProfile]);
  const submittedSearch = useMemo(
    () => normalizedSearchProfile(submittedSearchProfile ?? searchProfile),
    [searchProfile, submittedSearchProfile],
  );
  const visibleApplications = useMemo(() => {
    const query = applicationQuery.trim().toLocaleLowerCase();
    const now = Date.now();
    const stageOrder = new Map(applicationStatuses.map((status, index) => [status, index]));
    const eventTime = (application: Application) => {
      const timestamp = application.eventDateTime ? Date.parse(application.eventDateTime) : Number.NaN;
      return Number.isNaN(timestamp) ? null : timestamp;
    };

    const filtered = applications.filter((application) => {
      const timestamp = eventTime(application);
      const matchesQuery = !query || [
        application.role,
        application.company,
        application.location,
        application.eventType,
        application.nextStep,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesStage = applicationStageFilter === "all" || application.status === applicationStageFilter;
      const matchesMeeting =
        applicationMeetingFilter === "all" ||
        (applicationMeetingFilter === "upcoming" && timestamp !== null && timestamp >= now) ||
        (applicationMeetingFilter === "past" && timestamp !== null && timestamp < now) ||
        (applicationMeetingFilter === "unscheduled" && timestamp === null);
      return matchesQuery && matchesStage && matchesMeeting;
    });

    return [...filtered].sort((a, b) => {
      if (applicationSort === "company-az") return a.company.localeCompare(b.company);
      if (applicationSort === "role-az") return a.role.localeCompare(b.role);
      if (applicationSort === "stage") return (stageOrder.get(a.status) ?? 99) - (stageOrder.get(b.status) ?? 99);
      if (applicationSort === "priority") {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (applicationSort === "applied-newest") {
        return (Date.parse(b.appliedDate) || 0) - (Date.parse(a.appliedDate) || 0);
      }
      if (applicationSort === "applied-oldest") {
        return (Date.parse(a.appliedDate) || Number.MAX_SAFE_INTEGER) - (Date.parse(b.appliedDate) || Number.MAX_SAFE_INTEGER);
      }
      const first = eventTime(a);
      const second = eventTime(b);
      if (applicationSort === "meeting-latest") {
        const firstRank = first ?? Number.MIN_SAFE_INTEGER;
        const secondRank = second ?? Number.MIN_SAFE_INTEGER;
        return secondRank - firstRank || a.company.localeCompare(b.company);
      }
      const firstRank = first !== null && first >= now ? first : Number.MAX_SAFE_INTEGER;
      const secondRank = second !== null && second >= now ? second : Number.MAX_SAFE_INTEGER;
      return firstRank - secondRank || a.company.localeCompare(b.company);
    });
  }, [applicationMeetingFilter, applicationQuery, applicationSort, applicationStageFilter, applications]);

  const visibleContacts = useMemo(() => {
    const query = contactQuery.trim().toLocaleLowerCase();
    const now = Date.now();
    const healthOrder: Record<TrafficLight, number> = { red: 0, yellow: 1, green: 2, none: 3 };
    const timestamp = (value: string) => {
      const parsed = value ? Date.parse(value) : Number.NaN;
      return Number.isNaN(parsed) ? null : parsed;
    };
    const filtered = contacts.filter((contact) => {
      const meetingTime = timestamp(contact.eventDateTime);
      const matchesQuery = !query || [contact.name, contact.company, contact.role, contact.relationship, contact.nextAction, contact.notes].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesHealth = contactHealthFilter === "all" || contact.trafficLight === contactHealthFilter;
      const matchesMeeting =
        contactMeetingFilter === "all" ||
        (contactMeetingFilter === "upcoming" && meetingTime !== null && meetingTime >= now) ||
        (contactMeetingFilter === "past" && meetingTime !== null && meetingTime < now) ||
        (contactMeetingFilter === "unscheduled" && meetingTime === null);
      return matchesQuery && matchesHealth && matchesMeeting;
    });
    return [...filtered].sort((a, b) => {
      if (contactSort === "name-az") return a.name.localeCompare(b.name);
      if (contactSort === "company-az") return a.company.localeCompare(b.company) || a.name.localeCompare(b.name);
      if (contactSort === "health") return healthOrder[a.trafficLight] - healthOrder[b.trafficLight] || a.name.localeCompare(b.name);
      if (contactSort === "recent-contact") return (timestamp(b.lastContactDate) ?? 0) - (timestamp(a.lastContactDate) ?? 0);
      if (contactSort === "meeting-soonest") {
        const first = timestamp(a.eventDateTime);
        const second = timestamp(b.eventDateTime);
        const firstRank = first !== null && first >= now ? first : Number.MAX_SAFE_INTEGER;
        const secondRank = second !== null && second >= now ? second : Number.MAX_SAFE_INTEGER;
        return firstRank - secondRank || a.name.localeCompare(b.name);
      }
      const first = timestamp(a.nextActionDue) ?? Number.MAX_SAFE_INTEGER;
      const second = timestamp(b.nextActionDue) ?? Number.MAX_SAFE_INTEGER;
      return first - second || a.name.localeCompare(b.name);
    });
  }, [contactHealthFilter, contactMeetingFilter, contactQuery, contactSort, contacts]);

  function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotice("Please choose an image smaller than 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 320;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 320, 320);
        setUserProfile((current) => ({ ...current, avatarDataUrl: canvas.toDataURL("image/jpeg", 0.84) }));
        setNotice("Profile photo updated ✨");
      };
      image.onerror = () => setNotice("Carvio could not read that image.");
      image.src = String(reader.result);
    };
    reader.onerror = () => setNotice("Carvio could not read that image.");
    reader.readAsDataURL(file);
  }

  function uploadCompanyLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice(language === "he" ? "יש לבחור קובץ תמונה." : "Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setNotice(language === "he" ? "יש לבחור לוגו קטן מ־3MB." : "Please choose a logo smaller than 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setApplicationDraft((current) => ({ ...current, logoUrl: String(reader.result) }));
    reader.onerror = () => setNotice(language === "he" ? "לא הצלחנו לקרוא את התמונה." : "Carvio could not read that image.");
    reader.readAsDataURL(file);
  }

  const showCompanySearchLeads = false;
  const jobInbox = useMemo<JobInboxItem[]>(() => {
    if (!showSearchResults || !resolvedSearch.role || !resolvedSearch.country) return [];
    const companiesByCountry: Record<string, string[]> = {
      Netherlands: ["Booking.com", "Adyen", "Miro", "Mollie", "Picnic", "TomTom"],
      Israel: ["Wix", "Monday.com", "Fiverr", "Payoneer", "Similarweb", "AppsFlyer"],
      Germany: ["Zalando", "N26", "Delivery Hero", "Personio", "Celonis", "HelloFresh"],
      "United Kingdom": ["Wise", "Revolut", "Monzo", "Deliveroo", "Checkout.com", "Octopus Energy"],
      "United States": ["HubSpot", "Airbnb", "Stripe", "Notion", "Figma", "Asana"],
    };
    const companies = companiesByCountry[resolvedSearch.country] || ["Northstar", "Lumina", "Orbit", "Vertex", "Horizon", "Nova"];
    return companies.map((company, index) => {
      const companyRoute = companyJobSearchRoute(searchProfile, company, index);
      return {
        id: `${resolvedSearch.role}-${resolvedSearch.city || resolvedSearch.country}-${company}`.toLowerCase().replace(/\W+/g, "-"),
        company,
        role: resolvedSearch.role,
        location: resolvedSearch.location,
        source: companyRoute.provider,
        url: companyRoute.url,
        match: Math.max(72, 94 - index * 4),
        posted: index < 2 ? (language === "he" ? "24 השעות האחרונות" : "Past 24 hours") : (language === "he" ? "השבוע האחרון" : "Past week"),
        reason: searchProfile.skills
          ? `${searchProfile.skills.split(",").slice(0, 2).join(" · ")} · ${searchProfile.workModel || (language === "he" ? "כל מודל עבודה" : "Any work model")}`
          : `${resolvedSearch.city || resolvedSearch.country} · ${searchProfile.seniority || (language === "he" ? "כל דרגה" : "Any seniority")}`,
      };
    }).filter((item) => !hiddenJobIds.includes(item.id));
  }, [hiddenJobIds, language, resolvedSearch, searchProfile, showSearchResults]);

  function smartCaptureApplication() {
    setSmartCaptureError("");
    let parsed: URL;
    try {
      parsed = new URL(smartCaptureUrl.trim());
    } catch {
      setSmartCaptureError(language === "he" ? "יש להדביק כתובת מלאה ותקינה." : "Paste a complete, valid job URL.");
      return;
    }
    const host = parsed.hostname.replace(/^www\./, "");
    const knownBoard = /linkedin|indeed|glassdoor|google/i.test(host);
    const companyToken = host.split(".")[0].replace(/[-_]/g, " ");
    const pathParts = decodeURIComponent(parsed.pathname).split("/").filter(Boolean).filter((part) => !/^(jobs?|careers?|view|position|vacancy)$/i.test(part));
    const roleToken = ([...pathParts].reverse().find((part) => !/^\d+$/.test(part)) || "").replace(/[-_]/g, " ").replace(/\b\d{5,}\b/g, "").trim();
    const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());
    setEditingApplicationId(null);
    setApplicationDraft({
      ...emptyApplication,
      company: knownBoard ? "" : titleCase(companyToken),
      companyWebsite: knownBoard ? "" : parsed.origin,
      logoUrl: knownBoard ? "" : companyLogoFromWebsite(parsed.origin),
      role: titleCase(roleToken),
      jobUrl: parsed.toString(),
      source: /linkedin/i.test(host) ? "LinkedIn" : /indeed/i.test(host) ? "Indeed" : "Company careers page",
      nextStep: language === "he" ? "בדיקת התפקיד והתאמת קורות החיים" : "Review the role and tailor the CV",
    });
    setShowApplicationDetails(true);
    setShowSmartCapture(false);
    setSmartCaptureUrl("");
    setShowApplicationModal(true);
  }

  function completeApplicationAction(application: Application) {
    setApplications((items) => items.map((item) => item.id === application.id ? { ...item, nextStep: "", nextStepDue: "", trafficLight: item.trafficLight === "red" ? "yellow" : item.trafficLight } : item));
    setNotice(language === "he" ? "הפעולה הושלמה — מצוין 🌱" : "Action completed — momentum saved 🌱");
  }

  function snoozeApplication(application: Application, days = 2) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setApplications((items) => items.map((item) => item.id === application.id ? { ...item, nextStepDue: date.toISOString().slice(0, 10), trafficLight: "yellow" } : item));
    setNotice(language === "he" ? `נדחה בעוד ${days} ימים.` : `Snoozed for ${days} days.`);
  }

  function saveInboxJob(item: JobInboxItem, alreadyApplied = false) {
    const exists = applications.some((application) => application.company.toLowerCase() === item.company.toLowerCase() && application.role.toLowerCase() === item.role.toLowerCase());
    if (exists) {
      setNotice(language === "he" ? "המשרה כבר נמצאת במועמדויות." : "This role is already in Applications.");
      return;
    }
    setApplications((items) => [{
      ...normalizeApplication({
        id: makeId("app"),
        company: item.company,
        role: item.role,
        location: item.location,
        source: item.source,
        jobUrl: item.url,
        status: alreadyApplied ? "Applied" : "Applied",
        nextStep: alreadyApplied ? "Plan follow-up" : "Review and decide whether to apply",
        trafficLight: "none",
      }),
    }, ...items]);
    setNotice(alreadyApplied ? (language === "he" ? "נשמר כמשרה שהוגשה." : "Saved as applied.") : (language === "he" ? "נשמר במועמדויות לבדיקה." : "Saved to Applications for review."));
  }

  function openNewApplication() {
    setEditingApplicationId(null);
    setApplicationDraft(emptyApplication);
    setShowApplicationDetails(false);
    setShowApplicationModal(true);
  }

  function openEditApplication(application: Application) {
    setEditingApplicationId(application.id);
    const { id: _id, ...draft } = application;
    void _id;
    setApplicationDraft(draft);
    setShowApplicationDetails(true);
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
      setNotice("Application added — one thoughtful step forward 🎉");
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
    setNotice(status === "Interview" ? `${application.company} moved to Interview — take a moment to celebrate 🎉` : status === "Offer" ? `An offer from ${application.company} — what a milestone! ✨` : `${application.company} moved to ${status}.`);
    if (status === "Rejected" && application.status !== "Rejected" && !recoveryEntries.some((entry) => entry.applicationId === application.id)) {
      window.setTimeout(() => setRecoveryApplication(updated), 250);
    }
  }

  function openNewContact() {
    setEditingContactId(null);
    setContactDraft(emptyContact);
    setShowContactDetails(false);
    setShowContactModal(true);
  }

  function openEditContact(contact: Contact) {
    setEditingContactId(contact.id);
    const { id: _id, ...draft } = contact;
    void _id;
    setContactDraft(draft);
    setShowContactDetails(true);
    setShowContactModal(true);
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingContactId) {
      setContacts((items) => items.map((item) => item.id === editingContactId ? { ...contactDraft, id: item.id } : item));
      setNotice("Contact updated.");
    } else {
      setContacts((items) => [{ ...contactDraft, id: makeId("contact") }, ...items]);
      setNotice("New connection added — your network is growing 🤝");
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
    setResumeProcessing(true);
    const additions = await Promise.all(selected.map(async (file) => {
      let extractedText = "";
      if (file.size <= 10_000_000) {
        try { extractedText = await extractResumeText(file); } catch { extractedText = ""; }
      }
      return { id: makeId("resume"), name: file.name, size: file.size, type: file.type || "Unknown type", addedAt: new Date().toISOString(), extractedText } satisfies ResumeFile;
    }));
    setResumeProcessing(false);
    setResumes((items) => [...items, ...additions]);
    const first = additions[0];
    if (first) {
      setSelectedResumeId(first.id);
      setResumeText(first.extractedText.slice(0, 30000));
    }
    const ready = additions.filter((item) => item.extractedText).length;
    setNotice(ready ? `${ready} CV ${ready === 1 ? "version is" : "versions are"} ready for review ✨` : "CV saved. This file needs editable text or a non-scanned PDF for an automatic review.");
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
    updateSearchProfile({ skills: next.join(", ") });
  }

  function updateSearchProfile(patch: Partial<SearchProfile>) {
    setSearchProfile((current) => ({ ...current, ...patch }));
    setShowSearchResults(false);
    setSubmittedSearchProfile(null);
  }

  function updateSearchRole(role: string) {
    setSearchProfile((current) => {
      const roleChanged = current.role.trim().toLocaleLowerCase() !== role.trim().toLocaleLowerCase();
      return {
        ...current,
        role,
        ...(roleChanged ? { skills: "", industry: "", seniority: "", exclude: "" } : {}),
      };
    });
    setShowSearchResults(false);
    setSubmittedSearchProfile(null);
  }

  function runJobSearch() {
    const snapshot = { ...searchProfile, role: searchProfile.role.trim(), location: searchProfile.location.trim() };
    setSubmittedSearchProfile(snapshot);
    setShowSearchResults(true);
    window.setTimeout(() => document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function saveSearchAsApplication() {
    setEditingApplicationId(null);
    setApplicationDraft({ ...emptyApplication, role: resolvedSearch.role, company: "", location: resolvedSearch.location, source: "Carvio Job Search", nextStep: "Review matching roles and save the strongest one", priority: "Medium" });
    setShowApplicationModal(true);
  }

  function openOutreachForApplication(application: Application) {
    setMessageProfile({ ...emptyMessageProfile, recipientType: application.contactName ? "Recruiter" : "Hiring manager", intent: application.status === "Applied" ? "Follow up after applying" : "Introduce myself", recipientName: application.contactName, company: application.company, role: application.role });
    setGeneratedMessage("");
    setExpandedTools((current) => ({ ...current, studio: true }));
    navigateToSection("message-studio");
  }

  function planMessageFollowUp() {
    const match = applications.find((item) => item.company.toLowerCase() === messageProfile.company.trim().toLowerCase() && item.role.toLowerCase() === messageProfile.role.trim().toLowerCase());
    if (!match) {
      setNotice("Save this role in Applications first, then Carvio can plan its follow-up.");
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + 7);
    setApplications((items) => items.map((item) => item.id === match.id ? { ...item, nextStep: `Follow up on outreach to ${messageProfile.recipientName || messageProfile.recipientType.toLowerCase()}`, nextStepDue: due.toISOString().slice(0, 10) } : item));
    setNotice("Follow-up added to the application for seven days from now ✅");
  }

  function createPostDraft() {
    if (!postProfile.topic.trim() && !postProfile.keyPoint.trim()) {
      setNotice(language === "he" ? "כדאי להוסיף נושא או מסר מרכזי כדי ליצור פוסט מדויק." : "Add a topic or key point so Carvio can create a focused post.");
      return;
    }
    setGeneratedPost(generateSocialPost(postProfile, language));
    setNotice(language === "he" ? "טיוטת הפוסט מוכנה לעריכה ✨" : "Your post draft is ready to edit ✨");
  }

  async function sharePost() {
    if (!generatedPost.trim()) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${postProfile.platform} post`, text: generatedPost });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(generatedPost);
    setNotice(language === "he" ? "הפוסט הועתק. כעת אפשר להדביק אותו בפלטפורמה 📋" : "Post copied. You can now paste it into the platform 📋");
  }

  async function openSocialPlatform() {
    if (generatedPost.trim()) await navigator.clipboard.writeText(generatedPost).catch(() => undefined);
    const urls: Record<SocialPlatform, string> = {
      LinkedIn: "https://www.linkedin.com/feed/?shareActive=true",
      Instagram: "https://www.instagram.com/",
      Facebook: "https://www.facebook.com/",
    };
    window.open(urls[postProfile.platform], "_blank", "noopener,noreferrer");
    setNotice(language === "he" ? `הפוסט הועתק ו־${postProfile.platform} נפתח. נשאר רק להדביק ולאשר.` : `Post copied and ${postProfile.platform} opened. Paste, review, and publish when ready.`);
  }

  function exportCarvioData() {
    const backup = { version: 1, exportedAt: new Date().toISOString(), applications, contacts, resumes, searchProfile, recoveryEntries, userProfile };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `carvio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Your private Carvio backup was downloaded 🔒");
  }

  async function importCarvioData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as { applications?: Partial<Application>[]; contacts?: (Partial<Contact> & { companyRole?: string })[]; resumes?: ResumeFile[]; searchProfile?: Partial<SearchProfile>; recoveryEntries?: RecoveryEntry[]; userProfile?: Partial<UserProfile> };
      if (!Array.isArray(backup.applications) || !Array.isArray(backup.contacts)) throw new Error("Invalid backup");
      setApplications(backup.applications.map(normalizeApplication));
      setContacts(backup.contacts.map(normalizeContact));
      if (Array.isArray(backup.resumes)) setResumes(backup.resumes.slice(0, 6));
      if (backup.searchProfile) setSearchProfile({ ...emptySearchProfile, ...backup.searchProfile });
      if (Array.isArray(backup.recoveryEntries)) setRecoveryEntries(backup.recoveryEntries);
      if (backup.userProfile) setUserProfile({ ...emptyUserProfile, ...backup.userProfile });
      setNotice("Backup restored successfully ✅");
    } catch {
      setNotice("This file is not a valid Carvio backup.");
    }
  }

  function deleteAllLocalData() {
    if (!window.confirm("Permanently delete all Carvio data stored in this browser? Download a backup first if you may need it later.")) return;
    [APPLICATIONS_KEY, CONTACTS_KEY, FEEDBACK_KEY, RESUMES_KEY, SEARCH_PROFILE_KEY, RECOVERY_KEY, PROFILE_KEY, CHECKIN_KEY, ANALYTICS_SAMPLE_PACK_KEY].forEach((key) => window.localStorage.removeItem(key));
    setApplications([]); setContacts([]); setResumes([]); setRecoveryEntries([]); setSearchProfile(emptySearchProfile); setUserProfile(emptyUserProfile); setDailyMood(""); setShowTrustCenter(false);
    setNotice("All local Carvio data was deleted.");
  }

  function resetDemoData() {
    if (window.confirm("Reset applications and contacts to the original demo data? Your current entries will be replaced.")) {
      setApplications(demoApplications.map(normalizeApplication));
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

  const copy = uiCopy[language];
  const statusLabel = (status: ApplicationStatus) => language === "he" ? ({
    Applied: "הוגשה מועמדות",
    Interview: "ראיון",
    Offer: "הצעה",
    "Follow-up due": "נדרשת פעולת המשך",
    Rejected: "נדחתה",
    Withdrawn: "הוסרה",
  } as Record<ApplicationStatus, string>)[status] : status;

  if (!hydrated) {
    return <main className="min-h-screen bg-slate-50" aria-label="Loading Carvio" />;
  }

  if (showLanding) {
    return (
      <main className={`carvio-welcome welcome-theme-${theme}`} dir={language === "he" ? "rtl" : "ltr"}>
        <nav className="welcome-nav">
          <strong>CARVIO</strong>
          <button onClick={() => setLanguage(language === "en" ? "he" : "en")} type="button"><Languages className="h-4 w-4" />{language === "en" ? "עברית" : "English"}</button>
        </nav>
        <section className="welcome-hero">
          <div className="welcome-copy">
            <span className="welcome-kicker"><Sparkles className="h-4 w-4" />{language === "he" ? "חיפוש עבודה, עם פחות עומס" : "A calmer way to move your career forward"}</span>
            <h1>{language === "he" ? "כל חיפוש העבודה שלכם. צעד ברור אחד בכל פעם." : "Your whole job search. One clear next move at a time."}</h1>
            <p>{language === "he" ? "רכזו מועמדויות, קשרים, פגישות ופעולות המשך במקום אחד — וקבלו בכל יום הכוונה שמקדמת אתכם." : "Bring applications, conversations, interviews and follow-ups into one focused workspace—and know what matters today."}</p>
            <div className="welcome-actions">
              <button onClick={enterWorkspace} type="button">{language === "he" ? "כניסה לסביבת העבודה" : "Open my Carvio workspace"}<ArrowUpRight className="h-5 w-5" /></button>
              <span><ShieldCheck className="h-4 w-4" />{language === "he" ? "המידע נשמר במכשיר הזה" : "Your data stays on this device"}</span>
            </div>
          </div>
          <figure className="landing-hero-visual">
            <div className="landing-hero-image"><Image alt={language === "he" ? "איור של אדם שהופך חלקים מפוזרים למסלול ברור של צעדים בחיפוש העבודה" : "An illustration of a person turning scattered pieces into a clear job-search path"} fill priority sizes="(max-width: 760px) min(calc(100vw - 2rem), 336px), 448px" src="/carvio-landing-warm-accents-v8.png" /></div>
            <figcaption>{language === "he" ? "לראות את כל התהליך. לפעול לפי מה שחשוב עכשיו." : "See the whole search. Act on what matters next."}</figcaption>
          </figure>
        </section>
        <section className="welcome-benefits">
          {[
            { Icon: BriefcaseBusiness, title: language === "he" ? "לארגן את החיפוש במקום אחד" : "Organize the search in one place", text: language === "he" ? "מועמדויות, קשרים, פגישות וצעדים הבאים נשארים בתמונה אחת ברורה." : "Keep applications, contacts, meetings, and next steps in one clear view." },
            { Icon: Target, title: language === "he" ? "לדעת מה הצעד הבא" : "Know the next move", text: language === "he" ? "Carvio מרכז את תשומת הלב בפעולה המועילה ביותר כרגע." : "Carvio focuses your attention on the most useful action right now." },
            { Icon: HeartHandshake, title: language === "he" ? "להחזיר את התנופה" : "Recover momentum", text: language === "he" ? "התקדמו לפי הפעולות שבשליטתכם, גם כשהתהליך אינו צפוי." : "Keep moving through the actions you control, even when the search is unpredictable." },
          ].map(({ Icon, title, text }) => <article key={title}><Icon className="h-5 w-5" /><h2>{title}</h2><p>{text}</p></article>)}
        </section>
        <footer className="welcome-footer"><span>{language === "he" ? "Carvio · סביבת עבודה אישית לחיפוש עבודה" : "Carvio · Your personal job-search workspace"}</span></footer>
      </main>
    );
  }

  return (
    <main className={`carvio-shell min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8 ${theme === "light" ? "carvio-light" : theme === "ocean" ? "carvio-ocean" : theme === "plum" ? "carvio-plum" : ""}`} dir={language === "he" ? "rtl" : "ltr"}>
      <div className="calm-content mx-auto flex max-w-7xl flex-col gap-8">
        <header className={`calm-view carvio-hero relative scroll-mt-28 overflow-visible rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:p-8 ${activeView !== "home" ? "calm-view-hidden" : ""}`} id="dashboard">
          <div className="carvio-hero-top">
            <div className="profile-welcome-row">
              <div className="profile-photo-wrap">
                <label className="profile-photo-control" title={language === "he" ? "הוספה או שינוי תמונת פרופיל" : "Add or change your profile photo"}>
                  {userProfile.avatarDataUrl ? <Image alt="Your profile" height={320} src={userProfile.avatarDataUrl} unoptimized width={320} /> : <span>{userProfile.name.trim().slice(0, 1).toUpperCase() || "👤"}</span>}
                  <span className="profile-photo-badge"><UploadCloud className="h-3.5 w-3.5" /></span>
                  <input accept="image/*" className="sr-only" onChange={uploadProfilePhoto} type="file" />
                </label>
                {userProfile.avatarDataUrl && <button aria-label="Remove profile photo" className="profile-photo-remove" onClick={() => setUserProfile((current) => ({ ...current, avatarDataUrl: "" }))} type="button"><X className="h-3 w-3" /></button>}
              </div>
              <div className="profile-welcome-copy"><p className="text-sm font-medium text-slate-400">{copy.welcome}{userProfile.name ? `, ${userProfile.name}` : ""} <span className="inline-block animate-wave">👋</span></p><div className="profile-career-tag mt-1.5 inline-flex items-center gap-2 text-xs font-medium text-cyan-200"><Compass className="h-3.5 w-3.5" /> {copy.careerTag}</div></div>
            </div>
            <div className="hero-utility-actions">
              <button aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} className="hero-icon-button" onClick={() => selectTheme(theme === "light" ? "dark" : "light")} title={theme === "light" ? copy.dark : copy.light} type="button">{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
              <div className="relative">
                <button aria-expanded={showAppearance} aria-haspopup="dialog" aria-label={language === "he" ? "צבעים ונגישות" : "Colors and accessibility"} className="hero-icon-button" onClick={() => setShowAppearance((current) => !current)} title={language === "he" ? "צבעים ונגישות" : "Colors & accessibility"} type="button"><Palette className="h-4 w-4" /></button>
                {showAppearance && <div aria-label={language === "he" ? "בחירת פלטת צבעים" : "Choose a color palette"} className="appearance-menu" role="dialog"><p className="text-sm font-semibold">{copy.choosePalette}</p><div className="mt-3 grid grid-cols-2 gap-2">{([{ value: "dark", label: copy.darkForest, colors: ["#07110d", "#166534", "#14b8a6"] }, { value: "light", label: copy.cleanLight, colors: ["#ffffff", "#e0f2fe", "#059669"] }, { value: "ocean", label: copy.deepOcean, colors: ["#071827", "#075985", "#22d3ee"] }, { value: "plum", label: copy.warmPlum, colors: ["#211126", "#7e22ce", "#fb7185"] }] as { value: ColorTheme; label: string; colors: string[] }[]).map((option) => <button aria-pressed={theme === option.value} className={`palette-option ${theme === option.value ? "palette-option-active" : ""}`} key={option.value} onClick={() => { selectTheme(option.value); setShowAppearance(false); }} type="button"><span className="flex" aria-hidden="true">{option.colors.map((color) => <span className="h-5 w-5 border border-white/20 first:rounded-s-full last:rounded-e-full" key={color} style={{ backgroundColor: color }} />)}</span><span>{option.label}</span></button>)}</div></div>}
              </div>
              <button aria-label={language === "en" ? "Switch to Hebrew" : "Switch to English"} className="hero-language-button" onClick={() => setLanguage(language === "en" ? "he" : "en")} type="button"><Languages className="h-4 w-4" /> {copy.hebrew}</button>
            </div>
          </div>
          <div className="carvio-hero-main">
            <section className="home-focus" aria-labelledby="home-focus-title">
              <div className="home-focus-heading">
                <div>
                  <p className="eyebrow"><Zap className="h-4 w-4" />{copy.todayFocus} / {copy.nextBestAction}</p>
                  <span>{todayFocus.eyebrow}</span>
                </div>
              </div>
              <h1 id="home-focus-title">{homepageAction.title}</h1>
              <p>{homepageAction.support}</p>
              {homepageAction.urgency && <span className={`home-action-urgency ${homepageAction.urgency.startsWith("Overdue") || homepageAction.urgency.startsWith("באיחור") ? "home-action-overdue" : ""}`}><Clock3 className="h-3.5 w-3.5" />{homepageAction.urgency}</span>}
              <div className="home-focus-actions">
                <button className="home-primary-action" onClick={() => navigateToSection(homepageAction.target)} type="button"><span>{language === "he" ? "לביצוע הפעולה" : "Take this action"}</span><ArrowUpRight className="h-5 w-5" /></button>
                {actionApplication && <button onClick={() => setWorkspaceApplicationId(actionApplication.id)} type="button"><BriefcaseBusiness className="h-4 w-4" />{language === "he" ? "פתיחת סביבת העבודה" : "Open workspace"}</button>}
                {actionApplication && <div className="focus-calendar-control">
                  <button aria-expanded={activeCalendarMenu === `focus-${actionApplication.id}`} aria-haspopup="dialog" aria-label={language === "he" ? "אפשרויות יומן לפעולה המומלצת" : "Calendar options for the recommended action"} className="focus-calendar-trigger" onClick={() => setActiveCalendarMenu((current) => current === `focus-${actionApplication.id}` ? null : `focus-${actionApplication.id}`)} type="button"><CalendarPlus className="h-4 w-4" /><span>{language === "he" ? "יומן" : "Calendar"}</span></button>
                  {activeCalendarMenu === `focus-${actionApplication.id}` && <ApplicationCalendarMenu application={actionApplication} language={language} onClose={() => setActiveCalendarMenu(null)} onEdit={() => { setActiveCalendarMenu(null); openEditApplication(actionApplication); setNotice(language === "he" ? "הוסיפו תאריך ושעה לפרטי הפגישה." : "Add a stage or meeting date, then return to the calendar action."); }} />}
                </div>}
              </div>
              {actionApplication && <div className="home-action-tools" aria-label={language === "he" ? "כלים לפעולה המומלצת" : "Recommended action tools"}>
                <button onClick={() => completeApplicationAction(actionApplication)} type="button"><CheckCircle2 className="h-4 w-4" />{language === "he" ? "בוצע" : "Mark done"}</button>
                <button onClick={() => snoozeApplication(actionApplication)} type="button"><Clock3 className="h-4 w-4" />{language === "he" ? "דחייה ביומיים" : "Snooze"}</button>
                <button onClick={() => openOutreachForApplication(actionApplication)} type="button"><MessagesSquare className="h-4 w-4" />{language === "he" ? "כתיבת הודעה" : "Write follow-up"}</button>
              </div>}
            </section>
            <aside className="home-now" aria-label={language === "he" ? "תמונת מצב" : "Current snapshot"}>
              <figure className="home-human-support">
                <div><Image alt={language === "he" ? "איור מופשט של אדם שמארגן צעדים בחיפוש העבודה" : "An abstract person organizing job-search steps"} fill priority sizes="(max-width: 767px) calc(100vw - 2.8rem), 340px" src="/carvio-landing-warm-accents-v8.png" /></div>
                <figcaption><HeartHandshake className="h-4 w-4" /><span>{language === "he" ? "התמקדו בצעדים שבשליטתכם, לא בהחלטות שאינן בידיכם." : "Focus on the actions you control—not the decisions you can’t."}</span></figcaption>
              </figure>
              <div className="home-now-cards">
                <button onClick={() => switchView("applications")} type="button"><CalendarClock className="h-5 w-5" /><span><small>{language === "he" ? "הפגישה הקרובה" : "Upcoming meeting"}</small><strong>{todaySnapshot.upcomingInterview ? todaySnapshot.upcomingInterview.company : (language === "he" ? "לא נקבעה פגישה" : "Nothing scheduled")}</strong><em>{todaySnapshot.upcomingInterview ? formatDate(todaySnapshot.upcomingInterview.eventDateTime, true) : (language === "he" ? "היומן פנוי" : "Your calendar is clear")}</em></span><ChevronRight className="h-4 w-4" /></button>
                <div className={todaySnapshot.overdue > 0 ? "home-now-alert" : ""}><CircleAlert className="h-5 w-5" /><span><small>{language === "he" ? "פעולות המשך באיחור" : "Overdue follow-ups"}</small><strong>{todaySnapshot.overdue}</strong><em>{todaySnapshot.overdue ? (language === "he" ? "דורשות תשומת לב" : "Need attention") : (language === "he" ? "הכול מעודכן" : "All caught up")}</em></span>{todaySnapshot.overdue > 0 && <button onClick={() => switchView("applications")} type="button">{language === "he" ? "לבדיקת פעולות ההמשך" : "Review follow-ups"}<ChevronRight className="h-3.5 w-3.5" /></button>}</div>
              </div>
              <div className="home-mini-metrics">
                {[metrics[0], metrics[1], metrics[3]].map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
              </div>
              <div className="home-momentum"><span>{language === "he" ? "התנופה השבועית" : "Weekly momentum"}</span><strong>{weeklyMomentum.total}/{weeklyMomentum.goal}</strong><i><b style={{ width: `${weeklyMomentum.progress}%` }} /></i></div>
            </aside>
          </div>
          <section aria-label={language === "he" ? "מסע הקריירה" : "Career journey"} className={`career-journey ${careerJourney.isEmpty ? "career-journey-empty" : ""} ${careerJourney.isRecovery ? "career-journey-recovery" : ""}`}>
            <div className="career-journey-intro">
              <div><span className="eyebrow">{language === "he" ? "מסע הקריירה" : "Career journey"}</span><h2>{language === "he" ? "החיפוש שלכם במבט אחד" : "Your search at a glance"}</h2></div>
              <p>{careerJourney.sentence}</p>
            </div>
            <div className="career-journey-canvas">
              <div aria-hidden="true" className="career-journey-motif"><Image alt="" fill sizes="150px" src="/carvio-landing-warm-accents-v8.png" /></div>
              <div aria-hidden="true" className="career-journey-path"><i /><i /><i /></div>
              <div className="career-journey-stations">
                {careerJourney.stations.map(({ id, label, value, Icon }, index) => <button aria-current={careerJourney.activeStation === id ? "step" : undefined} className={`${careerJourney.activeStation === id ? "career-station-active" : ""} ${id === "next" && todaySnapshot.overdue > 0 ? "career-station-attention" : ""}`} key={id} onClick={() => {
                  if (id === "applications") { setApplicationStageFilter("all"); switchView("applications"); }
                  if (id === "conversations") switchView("networking");
                  if (id === "interviews") { setApplicationStageFilter("Interview"); switchView("applications"); }
                  if (id === "next") { if (actionApplication) setWorkspaceApplicationId(actionApplication.id); else openNewApplication(); }
                }} type="button"><span className="career-station-node"><Icon className="h-4 w-4" /><b>{String(index + 1).padStart(2, "0")}</b></span><strong>{value}</strong><small>{label}</small></button>)}
              </div>
            </div>
            {careerJourney.isEmpty && <button className="career-journey-cta" onClick={openNewApplication} type="button"><Plus className="h-4 w-4" />{language === "he" ? "הוספת המועמדות הראשונה" : "Add your first application"}</button>}
          </section>
          <div className="home-quick-actions" aria-label={language === "he" ? "פעולות מהירות" : "Quick actions"}>
            <span>{language === "he" ? "פעולות מהירות" : "Quick actions"}</span>
            <button onClick={openNewApplication} type="button"><Plus className="h-4 w-4" />{copy.addApplication}</button>
            <button onClick={() => switchView("search")} type="button"><Search className="h-4 w-4" />{copy.search}</button>
            <button onClick={openNewContact} type="button"><Users2 className="h-4 w-4" />{copy.addContact}</button>
            <button onClick={() => switchView("applications")} type="button"><CalendarClock className="h-4 w-4" />{language === "he" ? "יומן" : "Calendar"}</button>
          </div>
        </header>

        <nav aria-label="Carvio main navigation" className="calm-desktop-nav">
          {([
            ["home", House, copy.overview],
            ["applications", BriefcaseBusiness, copy.applications],
            ["search", Search, copy.search],
            ["networking", Users2, copy.networking],
            ["tools", Wrench, copy.tools],
            ["more", BarChart3, copy.insights],
          ] as [AppView, typeof House, string][]).map(([view, Icon, label]) => <button aria-current={activeView === view ? "page" : undefined} className={`calm-nav-button ${view === "applications" ? "calm-nav-applications" : ""} ${activeView === view ? "calm-nav-button-active" : ""}`} key={view} onClick={() => switchView(view)} type="button"><Icon className="h-4 w-4" /><span>{label}</span>{view === "applications" && <small>{applications.length}</small>}</button>)}
          <button className="nav-command-trigger" onClick={() => setShowCommandBar(true)} type="button"><Search className="h-4 w-4" /><span>{language === "he" ? "חיפוש או מעבר מהיר…" : "Search or jump…"}</span><kbd>⌘K</kbd></button>
        </nav>

        {activeView !== "home" && <section className="calm-page-header"><div><p className="eyebrow text-cyan-300">Carvio</p><h1 className="text-2xl font-semibold">{activeView === "search" ? copy.search : activeView === "applications" ? copy.applications : activeView === "networking" ? copy.networking : activeView === "tools" ? copy.careerTools : copy.support}</h1><p className="mt-1 text-sm text-slate-400">{activeView === "search" ? (language === "he" ? "בחרו תפקיד ומיקום, הפעילו חיפוש ופתחו את התוצאות במקור." : "Choose a role and location, run the search, then open results at the source.") : activeView === "applications" ? copy.applicationIntro : activeView === "networking" ? copy.networkingIntro : activeView === "tools" ? copy.toolsIntro : copy.supportIntro}</p></div>{activeView === "search" ? <button className="primary-button" onClick={() => document.getElementById("search-form-fields")?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button"><Search className="h-4 w-4" />{language === "he" ? "התחלת חיפוש" : "Start searching"}</button> : <button className="icon-button" onClick={() => setShowQuickAdd(true)} type="button" aria-label={language === "he" ? "הוספה מהירה" : "Quick add"}><Plus className="h-5 w-5" /></button>}</section>}

        <section className={`calm-view checkin-card checkin-card-compact ${dailyMood ? "checkin-card-complete" : ""} ${activeView !== "home" ? "calm-view-hidden" : ""}`} aria-label="Daily check-in">
          <div className="checkin-compact-copy"><span aria-hidden="true">{dailyMood === "ready" ? "🙂" : dailyMood === "low" ? "😐" : dailyMood === "difficult" ? "😔" : "🌿"}</span><div><p className="eyebrow text-emerald-300">{copy.checkin}</p><h2>{dailyMood ? (language === "he" ? "התוכנית להיום הותאמה לרמת האנרגיה שלך." : "Today’s plan has been adjusted to your energy.") : copy.arriving}</h2></div></div>
          <div className="checkin-compact-options">{([{"value":"ready","emoji":"🙂","label":copy.ready},{"value":"low","emoji":"😐","label":copy.low},{"value":"difficult","emoji":"😔","label":copy.difficult}] as { value: Exclude<DailyMood, "">; emoji: string; label: string }[]).map((item) => <button aria-label={item.label} aria-pressed={dailyMood === item.value} className={`checkin-choice ${dailyMood === item.value ? "checkin-choice-active" : ""}`} key={item.value} onClick={() => { setDailyMood(item.value); setNotice(item.value === "ready" ? (language === "he" ? "בואו נבחר צעד משמעותי אחד 🎯" : "Let’s choose one meaningful move 🎯") : item.value === "low" ? (language === "he" ? "צעד קטן אחד מספיק להיום 🌿" : "One small action is enough today 🌿") : (language === "he" ? "Carvio ישמור על קצב עדין היום. התוצאות אינן מגדירות אותך 🫶" : "Carvio will keep today gentle. You are not your outcomes 🫶")); }} type="button"><span>{item.emoji}</span><span>{dailyMood && dailyMood !== item.value ? "" : item.label}</span></button>)}</div>
        </section>

        <section aria-label="Dashboard overview" className={`home-redundant-section calm-view dashboard-overview ${activeView !== "home" ? "calm-view-hidden" : ""}`}>
          <div className="dashboard-metrics">
          {[metrics[0], metrics[1], metrics[4]].map((metric) => {
            const Icon = metric.icon;
            return (
              <div className="metric-card dashboard-metric" key={metric.label}>
                <div className="dashboard-metric-icon"><Icon className="h-4 w-4" /></div>
                <div><p className="dashboard-metric-value">{metric.value}</p><p className="dashboard-metric-label">{metric.label}</p></div>
              </div>
            );
          })}
          </div>
          <div className="momentum-card">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-emerald-300">{language === "he" ? "התנופה השבועית" : "Weekly momentum"}</p><h2 className="mt-2 text-xl font-semibold">{language === "he" ? "התקדמות שבשליטתכם" : "Progress you can control"}</h2></div><span className="text-3xl" aria-hidden="true">🌱</span></div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400"><span>{language === "he" ? `${weeklyMomentum.total} פעולות משמעותיות השבוע` : `${weeklyMomentum.total} meaningful moves this week`}</span><span>{language === "he" ? `יעד: ${weeklyMomentum.goal}` : `Goal: ${weeklyMomentum.goal}`}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-cyan-400 transition-all duration-700" style={{ width: `${weeklyMomentum.progress}%` }} /></div>
            <div className="momentum-breakdown mt-4 grid grid-cols-3 gap-3 text-center"><div><strong className="block text-xl">{weeklyMomentum.recentApplications}</strong><span className="text-xs text-slate-400">{language === "he" ? "מועמדויות איכותיות" : "thoughtful applications"}</span></div><div><strong className="block text-xl">{weeklyMomentum.recentConversations}</strong><span className="text-xs text-slate-400">{language === "he" ? "שיחות חדשות" : "recent conversations"}</span></div><div><strong className="block text-xl">{weeklyMomentum.plannedMoves}</strong><span className="text-xs text-slate-400">{language === "he" ? "צעדים מתוכננים" : "planned next moves"}</span></div></div>
            <div className="momentum-wins" aria-label={language === "he" ? "הצלחות קטנות השבוע" : "Small wins this week"}>
              <span className={weeklyMomentum.recentApplications > 0 ? "momentum-win-complete" : ""}>✓ {language === "he" ? "מועמדות ממוקדת" : "Thoughtful application"}</span>
              <span className={weeklyMomentum.recentConversations > 0 ? "momentum-win-complete" : ""}>✓ {language === "he" ? "שיחה משמעותית" : "Meaningful conversation"}</span>
              <span className={weeklyMomentum.plannedMoves > 0 ? "momentum-win-complete" : ""}>✓ {language === "he" ? "צעד הבא נקבע" : "Next move planned"}</span>
            </div>
            <p className="momentum-note mt-4 text-xs leading-5 text-slate-500">{language === "he" ? "המדד מתמקד רק בפעולות שבשליטתכם — לא בדחיות או בהחלטות של מעסיקים." : "Momentum reflects only actions within your control—not rejection or employer decisions."}</p>
          </div>
        </section>

        <section className={`home-redundant-section calm-view panel today-panel ${activeView !== "home" ? "calm-view-hidden" : ""}`}>
          <div className="section-heading">
            <div>
              <p className="eyebrow flex items-center gap-2 text-cyan-300"><Zap className="h-4 w-4" /> {language === "he" ? "היום ב־Carvio" : "Today in Carvio"}</p>
              <h2 className="section-title">{language === "he" ? "רק מה שחשוב עכשיו" : "Only what matters right now"}</h2>
            </div>
            <button className="secondary-button" onClick={openNewApplication} type="button"><Plus className="h-4 w-4" />{copy.addApplication}</button>
          </div>
          <div className="today-grid">
            <button className="today-primary group" onClick={() => navigateToSection(nextBestActions[0]?.target || todayFocus.target)} type="button">
              <span className="today-icon">⚡</span>
              <span><small>{language === "he" ? "הפעולה המומלצת" : "Recommended next move"}</small><strong>{nextBestActions[0]?.label || todayFocus.title}</strong><em>{nextBestActions[0]?.detail || todayFocus.detail}</em></span>
              <ArrowUpRight className="h-5 w-5" />
            </button>
            <button className="today-item" onClick={() => switchView("applications")} type="button">
              <CalendarClock className="h-5 w-5" />
              <span><small>{language === "he" ? "הפגישה הקרובה" : "Next interview or meeting"}</small><strong>{todaySnapshot.upcomingInterview ? `${todaySnapshot.upcomingInterview.company} · ${formatDate(todaySnapshot.upcomingInterview.eventDateTime, true)}` : (language === "he" ? "אין פגישה מתוכננת" : "Nothing scheduled yet")}</strong></span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className={`today-item ${todaySnapshot.overdue > 0 ? "today-item-alert" : ""}`} onClick={() => switchView("applications")} type="button">
              <CircleAlert className="h-5 w-5" />
              <span><small>{language === "he" ? "פעולות המשך" : "Follow-ups"}</small><strong>{todaySnapshot.overdue > 0 ? (language === "he" ? `${todaySnapshot.overdue} פעולות דורשות טיפול` : `${todaySnapshot.overdue} ${todaySnapshot.overdue === 1 ? "item needs" : "items need"} attention`) : (language === "he" ? "הכול מעודכן" : "You’re all caught up")}</strong></span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {actionApplication && <div className="daily-action-center">
            <div><span>⚡ {language === "he" ? "מרכז הפעולות היומי" : "Daily action center"}</span><strong>{actionApplication.nextStep || `${language === "he" ? "בדיקת המועמדות ב־" : "Review "} ${actionApplication.company}`}</strong><small>{actionApplication.role} · {actionApplication.company}</small></div>
            <div>
              <button onClick={() => completeApplicationAction(actionApplication)} type="button"><CheckCircle2 className="h-4 w-4" />{language === "he" ? "בוצע" : "Mark done"}</button>
              <button onClick={() => snoozeApplication(actionApplication)} type="button"><Clock3 className="h-4 w-4" />{language === "he" ? "דחייה ביומיים" : "Snooze 2 days"}</button>
              <button onClick={() => openOutreachForApplication(actionApplication)} type="button"><MessagesSquare className="h-4 w-4" />{language === "he" ? "כתיבת הודעה" : "Write follow-up"}</button>
              <button onClick={() => setWorkspaceApplicationId(actionApplication.id)} type="button"><BriefcaseBusiness className="h-4 w-4" />{language === "he" ? "פתיחת סביבת העבודה" : "Open workspace"}</button>
            </div>
          </div>}
        </section>

        <section className={`home-redundant-section calm-view pilot-stories ${activeView !== "home" ? "calm-view-hidden" : ""}`} aria-label="סיפורי משתמשים להמחשה" dir="rtl">
          <div className="pilot-stories-heading"><div><p className="eyebrow text-violet-300">נבנה סביב חיפוש עבודה אמיתי</p><h2 className="section-title">דרך רגועה יותר להמשיך להתקדם</h2></div><span>דמויות וסיפורים להמחשה</span></div>
          <div className="pilot-stories-grid">
            <article className="pilot-story-card">
              <div className="pilot-story-top"><Image alt="דמותה הבדיונית של מיה" className="pilot-avatar" height={512} src="/people/maya-illustrative.jpg" width={512} /><div><strong>מיה לוי</strong><small>מנהלת People Operations · דמות להמחשה</small></div><span className="pilot-stars" aria-label="5 מתוך 5 כוכבים">★★★★★</span></div>
              <blockquote>״סוף סוף אני פותחת את המערכת ורואה מה כדאי לעשות היום, בלי להרגיש שכל הדחיות רודפות אחריי.״</blockquote>
            </article>
            <article className="pilot-story-card">
              <div className="pilot-story-top"><Image alt="דמותו הבדיונית של דניאל" className="pilot-avatar" height={512} src="/people/daniel-illustrative.jpg" width={512} /><div><strong>דניאל כהן</strong><small>בתהליך שינוי קריירה · דמות להמחשה</small></div><span className="pilot-stars" aria-label="5 מתוך 5 כוכבים">★★★★★</span></div>
              <blockquote>״המשרות, השיחות והפולואפים נמצאים במקום אחד. זה הוריד לי המון עומס מהראש ועזר לי לא לפספס דברים.״</blockquote>
            </article>
          </div>
        </section>

        <section className={`calm-view insights-hub ${activeView !== "more" ? "calm-view-hidden" : ""}`} aria-label="Insights and support overview">
          <div><p className="eyebrow text-cyan-300">{copy.reflection}</p><h2 className="mt-2 text-2xl font-semibold">{copy.whatHelps}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{copy.destination}</p></div>
          <div className="insights-hub-grid">
            <button onClick={() => document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button"><span>📊</span><strong>Search insights</strong><small>Patterns, charts and recommendations</small></button>
            <button onClick={() => document.getElementById("carvio-reset")?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button"><span>🌿</span><strong>Carvio Reset</strong><small>Recover gently after a setback</small></button>
            <button onClick={() => document.getElementById("preferences")?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button"><span>🎨</span><strong>Preferences</strong><small>Appearance, language and privacy</small></button>
            <button onClick={() => document.getElementById("pilot-feedback")?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button"><span>💬</span><strong>Send feedback</strong><small>Help shape the next version</small></button>
          </div>
        </section>

        <section className={`calm-view reset-panel ${activeView !== "more" ? "calm-view-hidden" : ""}`} id="carvio-reset">
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

        <section className={`calm-view grid gap-6 xl:grid-cols-[1.4fr_0.9fr] ${activeView !== "applications" ? "calm-view-hidden" : ""}`}>
          <div className="panel application-table-panel xl:col-span-2" id="applications">
            <div className="section-heading">
              <div><p className="eyebrow text-emerald-300">{copy.applicationsEyebrow}</p><h2 className="section-title">{copy.activeOpportunities}</h2></div>
              <div className="application-heading-actions">
                <button className="secondary-button" onClick={() => setShowSmartCapture(true)} type="button"><WandSparkles className="h-4 w-4" /> {language === "he" ? "לכידה חכמה מקישור" : "Smart capture"}</button>
                <button className="primary-button" onClick={openNewApplication} type="button"><Plus className="h-4 w-4" /> {copy.addApplication}</button>
              </div>
            </div>
            <div className="application-view-switcher" role="group" aria-label={language === "he" ? "בחירת תצוגה" : "Choose application view"}>
              {([
                ["table", "▦", language === "he" ? "טבלה" : "Table"],
                ["kanban", "▤", "Kanban"],
                ["calendar", "▦", language === "he" ? "יומן" : "Calendar"],
              ] as [ApplicationViewMode, string, string][]).map(([mode, icon, label]) => <button aria-pressed={applicationViewMode === mode} className={applicationViewMode === mode ? "application-view-active" : ""} key={mode} onClick={() => setApplicationViewMode(mode)} type="button"><span>{icon}</span>{label}</button>)}
            </div>
            {applications.length > 0 && (
              <div className={`application-toolbar ${showApplicationFilters ? "mobile-filters-expanded" : ""}`} aria-label={language === "he" ? "סינון ומיון מועמדויות" : "Filter and sort applications"}>
                <label className="application-search">
                  <Search aria-hidden="true" className="h-4 w-4" />
                  <span className="sr-only">{language === "he" ? "חיפוש מועמדות" : "Search applications"}</span>
                  <input
                    onChange={(event) => setApplicationQuery(event.target.value)}
                    placeholder={language === "he" ? "חיפוש חברה, תפקיד או מיקום…" : "Search company, role or location…"}
                    type="search"
                    value={applicationQuery}
                  />
                </label>
                <button aria-expanded={showApplicationFilters} className="mobile-filter-toggle" onClick={() => setShowApplicationFilters((current) => !current)} type="button"><SlidersHorizontal className="h-4 w-4" />{language === "he" ? "סינון ומיון" : "Filter & sort"}<ChevronDown className={`h-4 w-4 transition ${showApplicationFilters ? "rotate-180" : ""}`} /></button>
                <select aria-label={language === "he" ? "סינון לפי שלב" : "Filter by stage"} className="application-filter" onChange={(event) => setApplicationStageFilter(event.target.value as "all" | ApplicationStatus)} value={applicationStageFilter}>
                  <option value="all">{language === "he" ? "כל השלבים" : "All stages"}</option>
                  {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
                <select aria-label={language === "he" ? "סינון לפי פגישה" : "Filter by meeting"} className="application-filter" onChange={(event) => setApplicationMeetingFilter(event.target.value as ApplicationMeetingFilter)} value={applicationMeetingFilter}>
                  <option value="all">{language === "he" ? "כל הפגישות" : "All meetings"}</option>
                  <option value="upcoming">{language === "he" ? "פגישות קרובות" : "Upcoming"}</option>
                  <option value="past">{language === "he" ? "פגישות שהסתיימו" : "Past meetings"}</option>
                  <option value="unscheduled">{language === "he" ? "ללא מועד" : "No meeting date"}</option>
                </select>
                <label className="application-sort-control">
                  <span>{language === "he" ? "מיון לפי" : "Sort by"}</span>
                  <select aria-label={language === "he" ? "מיון מועמדויות" : "Sort applications"} className="application-filter" onChange={(event) => setApplicationSort(event.target.value as ApplicationSort)} value={applicationSort}>
                    <option value="meeting-soonest">{language === "he" ? "הפגישה הקרובה ביותר" : "Meeting: soonest first"}</option>
                    <option value="meeting-latest">{language === "he" ? "הפגישה הרחוקה ביותר" : "Meeting: latest first"}</option>
                    <option value="applied-newest">{language === "he" ? "הגשה חדשה תחילה" : "Applied: newest first"}</option>
                    <option value="applied-oldest">{language === "he" ? "הגשה ישנה תחילה" : "Applied: oldest first"}</option>
                    <option value="company-az">{language === "he" ? "שם חברה א׳–ת׳" : "Company A–Z"}</option>
                    <option value="role-az">{language === "he" ? "שם תפקיד א׳–ת׳" : "Role A–Z"}</option>
                    <option value="stage">{language === "he" ? "שלב בתהליך" : "Pipeline stage"}</option>
                    <option value="priority">{language === "he" ? "עדיפות גבוהה תחילה" : "Priority: high first"}</option>
                  </select>
                </label>
                <span className="application-results-count">{language === "he" ? `${visibleApplications.length} מתוך ${applications.length}` : `${visibleApplications.length} of ${applications.length}`}</span>
              </div>
            )}
            <div className="mt-5">
              {applications.length === 0 ? (
                <EmptyState icon={<BriefcaseBusiness className="h-6 w-6" />} title={language === "he" ? "עדיין אין מועמדויות" : "No applications yet"} text={language === "he" ? "הוסיפו את ההזדמנות הראשונה והתחילו לנהל את התהליך במקום אחד." : "Add your first opportunity to start tracking your pipeline."} action={copy.addApplication} onAction={openNewApplication} />
              ) : visibleApplications.length === 0 ? (
                <div className="application-no-results">
                  <Search className="h-5 w-5" />
                  <div><p className="font-semibold">{language === "he" ? "לא נמצאו תוצאות" : "No matching applications"}</p><p>{language === "he" ? "נסו לשנות את החיפוש או את הסינון." : "Try changing the search or filters."}</p></div>
                  <button className="text-button" onClick={() => { setApplicationQuery(""); setApplicationStageFilter("all"); setApplicationMeetingFilter("all"); }} type="button">{language === "he" ? "ניקוי סינון" : "Clear filters"}</button>
                </div>
              ) : (
                <>
                <div className="mobile-record-list">
                  {visibleApplications.map((application) => {
                    const isExpanded = expandedApplicationId === application.id;
                    return <article className="mobile-record-card" key={application.id}>
                      <div className="mobile-record-head">
                        <span aria-hidden="true" className={`application-company-logo ${application.logoUrl ? "application-company-logo-image" : ""}`} style={application.logoUrl ? { backgroundImage: `url("${application.logoUrl}")` } : undefined}>{application.logoUrl ? "" : application.company.slice(0, 1).toUpperCase()}</span>
                        <div><strong>{application.role}</strong><small>{application.company}{application.location ? ` · ${application.location}` : ""}</small></div>
                        <span className={`mobile-signal mobile-signal-${application.trafficLight}`} aria-label={application.trafficLight} />
                      </div>
                      <div className="mobile-record-meta"><span className={statusStyles[application.status]}>{statusLabel(application.status)}</span><span>{application.eventDateTime ? `📅 ${formatDate(application.eventDateTime, true)}` : (application.nextStepDue ? `⏱ ${formatDate(application.nextStepDue)}` : (language === "he" ? "ללא מועד" : "No date"))}</span></div>
                      <p className="mobile-record-next"><small>{language === "he" ? "הצעד הבא" : "Next move"}</small><strong>{application.nextStep || (language === "he" ? "לא הוגדר" : "Not set")}</strong></p>
                      {isExpanded && <div className="mobile-record-details"><span>{application.source || "—"}</span><span>{application.salary ? `${application.salaryCurrency} ${application.salary}` : "—"}</span><p>{application.notes || (language === "he" ? "אין הערות" : "No notes")}</p></div>}
                      <div className="mobile-record-actions">
                        <button onClick={() => openEditApplication(application)} type="button"><Pencil className="h-4 w-4" />{language === "he" ? "עריכה" : "Edit"}</button>
                        <div className="application-row-calendar-control"><button aria-expanded={activeCalendarMenu === `mobile-${application.id}`} aria-haspopup="dialog" aria-label={language === "he" ? `אפשרויות יומן עבור ${application.role} בחברת ${application.company}` : `Calendar options for ${application.role} at ${application.company}`} onClick={() => setActiveCalendarMenu((current) => current === `mobile-${application.id}` ? null : `mobile-${application.id}`)} title={language === "he" ? "הוספה ליומן" : "Add to calendar"} type="button"><CalendarPlus className="h-4 w-4" />{language === "he" ? "יומן" : "Calendar"}</button>{activeCalendarMenu === `mobile-${application.id}` && <ApplicationCalendarMenu application={application} language={language} onClose={() => setActiveCalendarMenu(null)} onEdit={() => { setActiveCalendarMenu(null); openEditApplication(application); setNotice(language === "he" ? "הוסיפו מועד לשלב או לפגישה במועמדות הזו." : "Add a stage or meeting date to this application."); }} />}</div>
                        <button aria-expanded={isExpanded} onClick={() => setExpandedApplicationId(isExpanded ? null : application.id)} type="button">{language === "he" ? "פרטים" : "Details"}<ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} /></button>
                        <button aria-label={language === "he" ? `מחיקת ${application.role}` : `Delete ${application.role}`} className="mobile-record-delete" onClick={() => deleteApplication(application)} type="button"><Trash2 className="h-4 w-4" /><span>{language === "he" ? "מחיקה" : "Delete"}</span></button>
                      </div>
                    </article>;
                  })}
                </div>
                <div className={`application-table-shell desktop-record-table ${applicationViewMode !== "table" ? "application-desktop-view-hidden" : ""}`}>
                  <div className="application-table-scroll">
                    <table className="application-table">
                      <thead>
                        <tr>
                          <th>{language === "he" ? "חברה" : "Company"}</th>
                          <th>{language === "he" ? "תפקיד" : "Job title"}</th>
                          <th>{language === "he" ? "מיקום" : "Location"}</th>
                          <th>{language === "he" ? "מקור" : "Source"}</th>
                          <th>{language === "he" ? "תאריך הגשה" : "Applied"}</th>
                          <th>{language === "he" ? "סטטוס" : "Status"}</th>
                          <th>{language === "he" ? "עדיפות" : "Priority"}</th>
                          <th>{language === "he" ? "ציפיות שכר" : "Salary"}</th>
                          <th>{language === "he" ? "מצב התהליך" : "Health"}</th>
                          <th>{language === "he" ? "פגישה קרובה" : "Next meeting"}</th>
                          <th className="application-actions-heading">{language === "he" ? "פעולות" : "Actions"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleApplications.map((application) => {
                          const isExpanded = expandedApplicationId === application.id;
                          const priorityLabel = language === "he" ? (application.priority === "High" ? "גבוהה" : application.priority === "Medium" ? "בינונית" : "נמוכה") : application.priority;
                          return (
                            <Fragment key={application.id}>
                              <tr className={`application-table-row ${isExpanded ? "application-table-row-expanded" : ""}`}>
                                <td className="application-company-cell"><span aria-hidden="true" className={`application-company-logo ${application.logoUrl ? "application-company-logo-image" : ""}`} style={application.logoUrl ? { backgroundImage: `url("${application.logoUrl}")` } : undefined}>{application.logoUrl ? "" : application.company.slice(0, 1).toUpperCase()}</span><strong>{application.company}</strong></td>
                                <td><span className="application-primary-value">{application.role}</span></td>
                                <td>{application.location || "—"}</td>
                                <td>{application.source || "—"}</td>
                                <td>{application.appliedDate ? formatDate(application.appliedDate) : "—"}</td>
                                <td>
                                  <select aria-label={`${language === "he" ? "סטטוס עבור" : "Status for"} ${application.role}`} className={`status-select application-table-status ${statusStyles[application.status]}`} onChange={(event) => updateApplicationStatus(application, event.target.value as ApplicationStatus)} value={application.status}>
                                    {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                                  </select>
                                </td>
                                <td><span className={`application-priority application-priority-${application.priority.toLowerCase()}`}>{priorityLabel}</span></td>
                                <td>{application.salary ? `${application.salaryCurrency} ${application.salary}` : "—"}</td>
                                <td><span className="application-health"><i className={trafficLightMeta[application.trafficLight].dot} /><span>{language === "he" ? ({ none: "ללא סטטוס", green: "מתקדם", yellow: "ממתין", red: "חסום" } as Record<TrafficLight, string>)[application.trafficLight] : trafficLightMeta[application.trafficLight].label}</span></span></td>
                                <td>{application.eventDateTime ? <span className="application-meeting-cell"><CalendarClock className="h-4 w-4" />{formatDate(application.eventDateTime, true)}</span> : "—"}</td>
                                <td className="application-row-actions">
                                  <button aria-label={language === "he" ? `פתיחת סביבת ${application.role}` : `Open ${application.role} workspace`} className="application-row-icon" onClick={() => setWorkspaceApplicationId(application.id)} title={language === "he" ? "סביבת המועמדות" : "Application workspace"} type="button"><BriefcaseBusiness className="h-4 w-4" /></button>
                                  <div className="application-row-calendar-control"><button aria-expanded={activeCalendarMenu === `row-${application.id}`} aria-haspopup="dialog" aria-label={language === "he" ? `אפשרויות יומן עבור ${application.role} בחברת ${application.company}` : `Calendar options for ${application.role} at ${application.company}`} className="application-row-icon application-row-calendar" onClick={() => setActiveCalendarMenu((current) => current === `row-${application.id}` ? null : `row-${application.id}`)} title={language === "he" ? "הוספה ליומן" : "Add to calendar"} type="button"><CalendarPlus className="h-4 w-4" /></button>{activeCalendarMenu === `row-${application.id}` && <ApplicationCalendarMenu application={application} language={language} onClose={() => setActiveCalendarMenu(null)} onEdit={() => { setActiveCalendarMenu(null); openEditApplication(application); setNotice(language === "he" ? "הוסיפו מועד לשלב או לפגישה במועמדות הזו." : "Add a stage or meeting date to this application."); }} />}</div>
                                  <button aria-label={language === "he" ? `עריכת ${application.role}` : `Edit ${application.role}`} className="application-row-icon" onClick={() => openEditApplication(application)} title={language === "he" ? "עריכה" : "Edit"} type="button"><Pencil className="h-4 w-4" /></button>
                                  <button aria-label={language === "he" ? `מחיקת ${application.role} בחברת ${application.company}` : `Delete ${application.role} at ${application.company}`} className="application-row-icon application-row-delete" onClick={() => deleteApplication(application)} title={language === "he" ? "מחיקה" : "Delete"} type="button"><Trash2 className="h-4 w-4" /></button>
                                  <button aria-expanded={isExpanded} className="application-details-button" onClick={() => setExpandedApplicationId(isExpanded ? null : application.id)} type="button"><span>{isExpanded ? (language === "he" ? "סגירה" : "Close") : (language === "he" ? "פרטים" : "Details")}</span><ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} /></button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="application-detail-row">
                                  <td colSpan={11}>
                                    <div className="application-detail-grid">
                                      <div className="application-detail-block"><span>{language === "he" ? "השלב הנוכחי והצעד הבא" : "Current stage / next step"}</span><strong>{application.nextStep || (language === "he" ? "לא הוגדר צעד הבא" : "No next step added")}</strong>{application.nextStepDue && <small>{isPast(application.nextStepDue) ? (language === "he" ? "באיחור מאז " : "Overdue since ") : (language === "he" ? "לביצוע עד " : "Due ")}{formatDate(application.nextStepDue)}</small>}</div>
                                      <div className="application-detail-block"><span>{language === "he" ? "פגישה או ראיון" : "Interview or meeting"}</span><strong>{application.eventType || (language === "he" ? "לא הוגדר סוג אירוע" : "No event type")}</strong><small>{application.eventDateTime ? formatDate(application.eventDateTime, true) : (language === "he" ? "לא נקבע מועד" : "Not scheduled")}</small></div>
                                      <div className="application-detail-block application-detail-notes"><span>{language === "he" ? "הערות" : "Notes"}</span><p>{application.notes || (language === "he" ? "אין הערות" : "No notes")}</p></div>
                                    </div>
                                    <div className="application-detail-actions">
                                      <button className="text-button" onClick={() => openEditApplication(application)} type="button"><Pencil className="h-4 w-4" /> {language === "he" ? "עריכה" : "Edit"}</button>
                                      <button className="text-button text-cyan-300" onClick={() => openOutreachForApplication(application)} type="button"><MessagesSquare className="h-4 w-4" /> {language === "he" ? "כתיבת פנייה" : "Write outreach"}</button>
                                      <button className="text-button text-emerald-300" onClick={() => navigateToSection("cv-lab")} type="button"><FileCheck2 className="h-4 w-4" /> {language === "he" ? "קורות חיים" : "CV"}</button>
                                      <button className="text-button text-violet-300" onClick={() => { if (application.eventDateTime) downloadICS(`${application.eventType}: ${application.role} at ${application.company}`, application.eventDateTime, application.notes || application.nextStep, application.location); else { openEditApplication(application); setNotice(language === "he" ? "הוסיפו תאריך ושעה כדי להפעיל את היומן." : "Add a date and time to enable calendar export."); } }} type="button"><CalendarPlus className="h-4 w-4" /> {language === "he" ? "הוספה ליומן" : "Add to calendar"}</button>
                                      {application.eventDateTime && <button className="text-button text-violet-300" onClick={() => openGoogleCalendar(`${application.eventType}: ${application.role} at ${application.company}`, application.eventDateTime, application.notes || application.nextStep, application.location)} type="button"><CalendarPlus className="h-4 w-4" /> Google Calendar</button>}
                                      <button className="text-button text-rose-300" onClick={() => deleteApplication(application)} type="button"><Trash2 className="h-4 w-4" /> {language === "he" ? "מחיקה" : "Delete"}</button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="application-table-hint"><span>↔</span>{language === "he" ? "בטלפון ניתן להחליק לצדדים כדי לראות את כל העמודות." : "On mobile, swipe sideways to see every column."}</p>
                </div>
                <div className={`application-kanban desktop-record-table ${applicationViewMode !== "kanban" ? "application-desktop-view-hidden" : ""}`}>
                  {applicationStatuses.map((status) => <section className="kanban-column" key={status}><header><strong>{statusLabel(status)}</strong><span>{visibleApplications.filter((item) => item.status === status).length}</span></header><div>{visibleApplications.filter((item) => item.status === status).map((application) => <article className="kanban-card" key={application.id}><div><span aria-hidden="true" className={`application-company-logo ${application.logoUrl ? "application-company-logo-image" : ""}`} style={application.logoUrl ? { backgroundImage: `url("${application.logoUrl}")` } : undefined}>{application.logoUrl ? "" : application.company.slice(0, 1)}</span><span><strong>{application.role}</strong><small>{application.company}</small></span></div><p>{application.nextStep || (language === "he" ? "אין צעד הבא" : "No next step")}</p><footer><i className={trafficLightMeta[application.trafficLight].dot} /><button onClick={() => setWorkspaceApplicationId(application.id)} type="button">{language === "he" ? "פתיחה" : "Open"}<ChevronRight className="h-3.5 w-3.5" /></button></footer></article>)}</div></section>)}
                </div>
                <div className={`application-calendar desktop-record-table ${applicationViewMode !== "calendar" ? "application-desktop-view-hidden" : ""}`}>
                  <header><div><CalendarClock className="h-5 w-5" /><span><strong>{language === "he" ? "סדר היום של התהליך" : "Pipeline agenda"}</strong><small>{language === "he" ? "ראיונות, פגישות ופעולות המשך במקום אחד" : "Interviews, meetings and follow-ups in one place"}</small></span></div></header>
                  <div>{visibleApplications.filter((item) => item.eventDateTime || item.nextStepDue).sort((a, b) => Date.parse(a.eventDateTime || a.nextStepDue) - Date.parse(b.eventDateTime || b.nextStepDue)).map((application) => <button className="calendar-agenda-row" key={application.id} onClick={() => setWorkspaceApplicationId(application.id)} type="button"><time><strong>{new Date(application.eventDateTime || application.nextStepDue).toLocaleDateString(language === "he" ? "he-IL" : "en-US", { day: "2-digit" })}</strong><span>{new Date(application.eventDateTime || application.nextStepDue).toLocaleDateString(language === "he" ? "he-IL" : "en-US", { month: "short" })}</span></time><i className={trafficLightMeta[application.trafficLight].dot} /><span><strong>{application.eventType || application.nextStep || statusLabel(application.status)}</strong><small>{application.role} · {application.company}</small></span><ChevronRight className="h-4 w-4" /></button>)}</div>
                </div></>
              )}
            </div>
          </div>

          <div className="panel smart-action-brief xl:col-span-2">
            <div className="smart-action-header">
              <div>
                <p className="eyebrow text-amber-300">{language === "he" ? "תדריך הפעולה שלך" : "Your action brief"}</p>
                <h2 className="section-title">{language === "he" ? "מה הכי כדאי לקדם עכשיו?" : "What should move next?"}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">{language === "he" ? "Carvio מתרגם את התהליך לפעולה אחת מרכזית ועוד כמה צעדים קצרים." : "Carvio translates your pipeline into one priority and a few supporting moves."}</p>
              </div>
              <span className="smart-action-live"><span />{language === "he" ? "מתעדכן מהנתונים שלך" : "Live from your data"}</span>
            </div>

            <div className="smart-primary-action">
              <div className="smart-primary-icon"><Zap className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="smart-action-kicker">{language === "he" ? "להתחיל כאן" : "Start here"}</p>
                <h3>{insights[0].title}</h3>
                <p>{insights[0].text}</p>
              </div>
              <div className="smart-primary-result">
                <strong>{insights[0].metric}</strong>
                <button onClick={() => switchView(insights[0].target)} type="button">{insights[0].action}<ArrowUpRight className="h-4 w-4" /></button>
              </div>
            </div>

            {insights.length > 1 && (
              <div className="smart-secondary-grid">
                {insights.slice(1).map((insight, index) => (
                  <button className="smart-secondary-action" key={insight.title} onClick={() => switchView(insight.target)} type="button">
                    <span className={`smart-secondary-dot ${insight.tone}`} />
                    <span className="min-w-0 flex-1">
                      <span className="smart-secondary-number">0{index + 2}</span>
                      <strong>{insight.title}</strong>
                      <small>{insight.text}</small>
                    </span>
                    <span className="smart-secondary-metric">{insight.metric}</span>
                    <ChevronRight className="smart-secondary-arrow h-4 w-4" />
                  </button>
                ))}
              </div>
            )}

            <div className="smart-action-privacy">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{language === "he" ? "הניתוח נוצר רק מהמידע השמור במכשיר הזה." : "This brief is calculated only from data stored on this device."}</span>
            </div>
          </div>
        </section>

        <section className={`calm-view panel ${activeView !== "networking" ? "calm-view-hidden" : ""}`} id="networking">
          <div className="section-heading">
            <div><p className="eyebrow text-fuchsia-300">{copy.networking}</p><h2 className="section-title">{copy.networkingTitle}</h2><p className="mt-2 text-sm text-slate-400">{language === "he" ? "נהלו קשרים, פעולות המשך ופגישות בתצוגה אחת מסודרת." : "Manage relationships, follow-ups and meetings in one organized view."}</p></div>
            <button className="primary-button bg-fuchsia-500 hover:bg-fuchsia-400" onClick={openNewContact} type="button"><Plus className="h-4 w-4" /> {copy.addContact}</button>
          </div>
          <div className={`application-toolbar networking-table-toolbar ${showContactFilters ? "mobile-filters-expanded" : ""}`} aria-label={language === "he" ? "סינון ומיון אנשי קשר" : "Filter and sort contacts"}>
            <label className="application-search"><Search className="h-4 w-4" /><span className="sr-only">{language === "he" ? "חיפוש אנשי קשר" : "Search contacts"}</span><input aria-label={language === "he" ? "חיפוש אנשי קשר" : "Search contacts"} onChange={(event) => setContactQuery(event.target.value)} placeholder={language === "he" ? "חיפוש לפי שם, חברה, תפקיד או פעולה…" : "Search name, company, role or next action…"} type="search" value={contactQuery} /></label>
            <button aria-expanded={showContactFilters} className="mobile-filter-toggle" onClick={() => setShowContactFilters((current) => !current)} type="button"><SlidersHorizontal className="h-4 w-4" />{language === "he" ? "סינון ומיון" : "Filter & sort"}<ChevronDown className={`h-4 w-4 transition ${showContactFilters ? "rotate-180" : ""}`} /></button>
            <select aria-label={language === "he" ? "סינון לפי מצב קשר" : "Filter by relationship health"} className="application-filter" onChange={(event) => setContactHealthFilter(event.target.value as "all" | TrafficLight)} value={contactHealthFilter}>
              <option value="all">{language === "he" ? "כל המצבים" : "All signals"}</option>
              <option value="green">{language === "he" ? "מתקדם" : "Progressing"}</option>
              <option value="yellow">{language === "he" ? "ממתין" : "Waiting"}</option>
              <option value="red">{language === "he" ? "דורש טיפול" : "Needs attention"}</option>
              <option value="none">{language === "he" ? "ללא סטטוס" : "No signal"}</option>
            </select>
            <select aria-label={language === "he" ? "סינון פגישות נטוורקינג" : "Filter networking meetings"} className="application-filter" onChange={(event) => setContactMeetingFilter(event.target.value as ContactMeetingFilter)} value={contactMeetingFilter}>
              <option value="all">{language === "he" ? "כל הפגישות" : "All meetings"}</option>
              <option value="upcoming">{language === "he" ? "פגישות קרובות" : "Upcoming"}</option>
              <option value="past">{language === "he" ? "פגישות שהתקיימו" : "Past"}</option>
              <option value="unscheduled">{language === "he" ? "ללא פגישה" : "Unscheduled"}</option>
            </select>
            <label className="application-sort-control"><span>{language === "he" ? "מיון לפי" : "Sort by"}</span><select aria-label={language === "he" ? "מיון אנשי קשר" : "Sort contacts"} className="application-filter" onChange={(event) => setContactSort(event.target.value as ContactSort)} value={contactSort}>
              <option value="next-action">{language === "he" ? "מיון: הפעולה הקרובה" : "Sort: Next action"}</option>
              <option value="meeting-soonest">{language === "he" ? "מיון: הפגישה הקרובה" : "Sort: Meeting soonest"}</option>
              <option value="recent-contact">{language === "he" ? "מיון: קשר אחרון" : "Sort: Last contacted"}</option>
              <option value="name-az">{language === "he" ? "מיון: שם א–ת" : "Sort: Name A–Z"}</option>
              <option value="company-az">{language === "he" ? "מיון: חברה א–ת" : "Sort: Company A–Z"}</option>
              <option value="health">{language === "he" ? "מיון: דורש טיפול" : "Sort: Needs attention"}</option>
            </select></label>
            <span className="application-results-count">{language === "he" ? `${visibleContacts.length} מתוך ${contacts.length}` : `${visibleContacts.length} of ${contacts.length}`}</span>
          </div>
          {contacts.length === 0 ? (
            <div className="mt-5"><EmptyState icon={<Users2 className="h-6 w-6" />} title={language === "he" ? "עדיין אין אנשי קשר" : "No contacts yet"} text={language === "he" ? "הוסיפו אדם שחשוב לכם לשמור איתו על קשר מקצועי." : "Add someone you want to keep in touch with."} action={copy.addContact} onAction={openNewContact} /></div>
          ) : visibleContacts.length === 0 ? (
            <div className="application-no-results">
              <Search className="h-5 w-5" />
              <div><p className="font-semibold">{language === "he" ? "לא נמצאו אנשי קשר" : "No matching contacts"}</p><p>{language === "he" ? "נסו לשנות את החיפוש או הסינון." : "Try changing the search or filters."}</p></div>
              <button className="text-button" onClick={() => { setContactQuery(""); setContactHealthFilter("all"); setContactMeetingFilter("all"); }} type="button">{language === "he" ? "ניקוי סינון" : "Clear filters"}</button>
            </div>
          ) : (
            <>
            <div className="mobile-record-list">
              {visibleContacts.map((contact) => {
                const isExpanded = expandedContactId === contact.id;
                return <article className="mobile-record-card mobile-contact-card" key={contact.id}>
                  <div className="mobile-record-head"><span className="networking-avatar">{contact.name.slice(0, 1).toUpperCase()}</span><div><strong>{contact.name}</strong><small>{contact.role || contact.relationship || (language === "he" ? "קשר מקצועי" : "Professional contact")}{contact.company ? ` · ${contact.company}` : ""}</small></div><span className={`mobile-signal mobile-signal-${contact.trafficLight}`} /></div>
                  <p className="mobile-record-next"><small>{language === "he" ? "הפעולה הבאה" : "Next move"}</small><strong>{contact.nextAction || (language === "he" ? "לא הוגדרה" : "Not set")}</strong></p>
                  <div className="mobile-record-meta"><span>{contact.nextActionDue ? `⏱ ${formatDate(contact.nextActionDue)}` : (language === "he" ? "ללא מועד" : "No date")}</span>{contact.eventDateTime && <span>📅 {formatDate(contact.eventDateTime, true)}</span>}</div>
                  {isExpanded && <div className="mobile-record-details"><span>{contact.email || contact.phone || "—"}</span><p>{contact.notes || (language === "he" ? "אין הערות" : "No notes")}</p></div>}
                  <div className="mobile-record-actions"><button onClick={() => openEditContact(contact)} type="button"><Pencil className="h-4 w-4" />{language === "he" ? "עריכה" : "Edit"}</button>{contact.eventDateTime && <button onClick={() => downloadICS(`${contact.eventType} with ${contact.name}`, contact.eventDateTime, contact.notes || contact.nextAction, contact.company)} type="button"><CalendarPlus className="h-4 w-4" />{language === "he" ? "יומן" : "Calendar"}</button>}<button aria-expanded={isExpanded} onClick={() => setExpandedContactId(isExpanded ? null : contact.id)} type="button">{language === "he" ? "פרטים" : "Details"}<ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} /></button></div>
                </article>;
              })}
            </div>
            <div className="application-table-shell networking-table-shell desktop-record-table">
              <div className="application-table-scroll">
                <table className="application-table networking-table">
                  <thead><tr>
                    <th>{language === "he" ? "איש קשר" : "Contact"}</th>
                    <th>{language === "he" ? "חברה" : "Company"}</th>
                    <th>{language === "he" ? "תפקיד" : "Role"}</th>
                    <th>{language === "he" ? "סוג קשר" : "Relationship"}</th>
                    <th>{language === "he" ? "קשר אחרון" : "Last contact"}</th>
                    <th>{language === "he" ? "מצב" : "Health"}</th>
                    <th>{language === "he" ? "הפעולה הבאה" : "Next action"}</th>
                    <th>{language === "he" ? "פגישה קרובה" : "Next meeting"}</th>
                    <th className="application-actions-heading">{language === "he" ? "פעולות" : "Actions"}</th>
                  </tr></thead>
                  <tbody>
                    {visibleContacts.map((contact) => {
                      const isExpanded = expandedContactId === contact.id;
                      return <Fragment key={contact.id}>
                        <tr className={`application-table-row ${isExpanded ? "application-table-row-expanded" : ""}`}>
                          <td className="networking-contact-cell"><span className="networking-avatar">{contact.name.slice(0, 1).toUpperCase()}</span><strong>{contact.name}</strong></td>
                          <td>{contact.company || "—"}</td>
                          <td><span className="application-primary-value">{contact.role || "—"}</span></td>
                          <td>{contact.relationship || "—"}</td>
                          <td>{contact.lastContactDate ? formatDate(contact.lastContactDate) : "—"}</td>
                          <td><select aria-label={`${language === "he" ? "מצב הקשר עם" : "Relationship health for"} ${contact.name}`} className="networking-health-select" onChange={(event) => setContacts((items) => items.map((item) => item.id === contact.id ? { ...item, trafficLight: event.target.value as TrafficLight } : item))} value={contact.trafficLight}><option value="none">{language === "he" ? "ללא סטטוס" : "No signal"}</option><option value="green">{language === "he" ? "🟢 מתקדם" : "🟢 Progressing"}</option><option value="yellow">{language === "he" ? "🟡 ממתין" : "🟡 Waiting"}</option><option value="red">{language === "he" ? "🔴 דורש טיפול" : "🔴 Needs attention"}</option></select></td>
                          <td><span className="networking-next-action"><strong>{contact.nextAction || "—"}</strong>{contact.nextActionDue && <small className={isPast(contact.nextActionDue) ? "text-rose-300" : ""}>{isPast(contact.nextActionDue) ? (language === "he" ? "באיחור · " : "Overdue · ") : ""}{formatDate(contact.nextActionDue)}</small>}</span></td>
                          <td>{contact.eventDateTime ? <span className="application-meeting-cell"><CalendarClock className="h-4 w-4" />{formatDate(contact.eventDateTime, true)}</span> : "—"}</td>
                          <td className="application-row-actions"><button aria-label={language === "he" ? `עריכת ${contact.name}` : `Edit ${contact.name}`} className="application-row-icon" onClick={() => openEditContact(contact)} type="button"><Pencil className="h-4 w-4" /></button><button aria-expanded={isExpanded} className="application-details-button" onClick={() => setExpandedContactId(isExpanded ? null : contact.id)} type="button"><span>{isExpanded ? (language === "he" ? "סגירה" : "Close") : (language === "he" ? "פרטים" : "Details")}</span><ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} /></button></td>
                        </tr>
                        {isExpanded && <tr className="application-detail-row"><td colSpan={9}>
                          <div className="application-detail-grid">
                            <div className="application-detail-block"><span>{language === "he" ? "פרטי קשר" : "Contact details"}</span><strong>{contact.email || contact.phone || (language === "he" ? "לא נוספו פרטים" : "No details added")}</strong><small>{contact.linkedInUrl ? "LinkedIn profile available" : (language === "he" ? "ללא קישור LinkedIn" : "No LinkedIn link")}</small></div>
                            <div className="application-detail-block"><span>{language === "he" ? "פגישה" : "Meeting"}</span><strong>{contact.eventType || (language === "he" ? "לא הוגדר סוג אירוע" : "No event type")}</strong><small>{contact.eventDateTime ? formatDate(contact.eventDateTime, true) : (language === "he" ? "לא נקבע מועד" : "Not scheduled")}</small></div>
                            <div className="application-detail-block application-detail-notes"><span>{language === "he" ? "הערות" : "Notes"}</span><p>{contact.notes || (language === "he" ? "אין הערות" : "No notes")}</p></div>
                          </div>
                          <div className="application-detail-actions">
                            <button className="text-button" onClick={() => openEditContact(contact)} type="button"><Pencil className="h-4 w-4" />{language === "he" ? "עריכה" : "Edit"}</button>
                            {contact.email && <a className="text-button text-cyan-300" href={`mailto:${contact.email}`}><Mail className="h-4 w-4" />{language === "he" ? "מייל" : "Email"}</a>}
                            {contact.phone && <a className="text-button text-emerald-300" href={`tel:${contact.phone}`}><Phone className="h-4 w-4" />{language === "he" ? "שיחה" : "Call"}</a>}
                            {contact.linkedInUrl && <a className="text-button text-sky-300" href={contact.linkedInUrl} rel="noreferrer" target="_blank"><LinkIcon className="h-4 w-4" />LinkedIn</a>}
                            <button className="text-button text-fuchsia-300" onClick={() => { if (contact.eventDateTime) downloadICS(`${contact.eventType} with ${contact.name}`, contact.eventDateTime, contact.notes || contact.nextAction, contact.company); else { openEditContact(contact); setNotice(language === "he" ? "הוסיפו תאריך ושעה כדי להפעיל את היומן." : "Add a date and time to enable calendar export."); } }} type="button"><CalendarPlus className="h-4 w-4" />{language === "he" ? "הוספה ליומן" : "Add to calendar"}</button>
                            {contact.eventDateTime && <button className="text-button text-violet-300" onClick={() => openGoogleCalendar(`${contact.eventType} with ${contact.name}`, contact.eventDateTime, contact.notes || contact.nextAction, contact.company)} type="button"><CalendarPlus className="h-4 w-4" />Google Calendar</button>}
                            <button className="text-button text-rose-300" onClick={() => deleteContact(contact)} type="button"><Trash2 className="h-4 w-4" />{language === "he" ? "מחיקה" : "Delete"}</button>
                          </div>
                        </td></tr>}
                      </Fragment>;
                    })}
                  </tbody>
                </table>
              </div>
              <p className="application-table-hint"><span>↔</span>{language === "he" ? "בטלפון ניתן להחליק לצדדים כדי לראות את כל העמודות." : "On mobile, swipe sideways to see every column."}</p>
            </div></>
          )}
        </section>

        <section className={`calm-view message-studio-panel ${activeView !== "tools" ? "calm-view-hidden" : ""}`} id="message-studio">
          <div className="pointer-events-none absolute -right-8 -top-8 text-8xl opacity-10">💬</div>
          <div className="section-heading relative">
            <div><p className="eyebrow flex items-center gap-2 text-pink-300"><span className="emoji-bounce">✍️</span> {copy.studio}</p><h2 className="section-title">{language === "he" ? "כתבו פנייה שאנשים באמת ירצו לענות עליה" : "Write outreach people will actually want to answer"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{language === "he" ? "בחרו למי פונים, את הטון ואת המטרה. Carvio יכין טיוטה מתחשבת שאפשר לערוך, להעתיק או לשלוח מיד." : "Choose who you’re contacting, the tone, and your goal. Carvio builds a thoughtful draft you can edit, copy, or send immediately."}</p></div>
            <div className="flex items-center gap-2"><div className="message-sparkle" aria-hidden="true">✨</div><button aria-expanded={expandedTools.studio} className="secondary-button" onClick={() => setExpandedTools((current) => ({ ...current, studio: !current.studio, social: false, cv: false }))} type="button">{language === "he" ? (expandedTools.studio ? "סגירת הסטודיו" : "פתיחת הסטודיו") : (expandedTools.studio ? "Close studio" : "Open studio")}<ChevronDown className={`h-4 w-4 transition ${expandedTools.studio ? "rotate-180" : ""}`} /></button></div>
          </div>
          {expandedTools.studio && (
          <div className="relative mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <fieldset><legend className="text-sm font-semibold text-slate-200">{language === "he" ? "1. למי פונים?" : "1. Who are you contacting?"}</legend><div className="mt-3 grid grid-cols-2 gap-2">{([{"label":"Recruiter","emoji":"🧲"},{"label":"Hiring manager","emoji":"🎯"},{"label":"Referral","emoji":"🤝"},{"label":"Networking contact","emoji":"☕"}] as { label: MessageProfile["recipientType"]; emoji: string }[]).map((item) => <button aria-pressed={messageProfile.recipientType === item.label} className={`choice-card ${messageProfile.recipientType === item.label ? "choice-card-active" : ""}`} key={item.label} onClick={() => setMessageProfile({ ...messageProfile, recipientType: item.label })} type="button"><span className="text-2xl">{item.emoji}</span><span>{language === "he" ? ({ Recruiter: "מגייס או מגייסת", "Hiring manager": "מנהל או מנהלת מגייסת", Referral: "בקשת הפניה", "Networking contact": "איש קשר מקצועי" } as Record<MessageProfile["recipientType"], string>)[item.label] : item.label}</span></button>)}</div></fieldset>
              <fieldset><legend className="text-sm font-semibold text-slate-200">{language === "he" ? "2. מה מטרת הפנייה?" : "2. What do you want?"}</legend><div className="mt-3 flex flex-wrap gap-2">{(["Introduce myself", "Ask for a referral", "Follow up after applying", "Request a conversation", "Thank them"] as MessageProfile["intent"][]).map((intent) => <button aria-pressed={messageProfile.intent === intent} className={`message-pill ${messageProfile.intent === intent ? "message-pill-active" : ""}`} key={intent} onClick={() => setMessageProfile({ ...messageProfile, intent })} type="button">{language === "he" ? ({ "Introduce myself": "להציג את עצמי", "Ask for a referral": "לבקש הפניה", "Follow up after applying": "פעולת המשך לאחר הגשה", "Request a conversation": "לבקש שיחה", "Thank them": "להודות" } as Record<MessageProfile["intent"], string>)[intent] : intent}</button>)}</div></fieldset>
              <fieldset><legend className="text-sm font-semibold text-slate-200">{language === "he" ? "3. בחירת הטון" : "3. Choose your tone"}</legend><div className="mt-3 flex flex-wrap gap-2">{(["Warm & professional", "Direct & confident", "Friendly & concise", "Senior & strategic"] as MessageProfile["tone"][]).map((tone) => <button aria-pressed={messageProfile.tone === tone} className={`message-pill ${messageProfile.tone === tone ? "message-pill-active" : ""}`} key={tone} onClick={() => setMessageProfile({ ...messageProfile, tone })} type="button">{language === "he" ? ({ "Warm & professional": "חם ומקצועי", "Direct & confident": "ישיר ובטוח", "Friendly & concise": "ידידותי ותמציתי", "Senior & strategic": "בכיר ואסטרטגי" } as Record<MessageProfile["tone"], string>)[tone] : tone}</button>)}</div></fieldset>
              <div className="grid gap-4 sm:grid-cols-2"><Field label={language === "he" ? "שם הנמען" : "Recipient name"}><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, recipientName: event.target.value })} placeholder="Dana" value={messageProfile.recipientName} /></Field><Field label={language === "he" ? "כתובת המייל של הנמען" : "Recipient email"}><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, recipientEmail: event.target.value })} placeholder="dana@company.com" type="email" value={messageProfile.recipientEmail} /></Field><Field label={language === "he" ? "חברה" : "Company"}><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, company: event.target.value })} placeholder={language === "he" ? "שם החברה" : "Company name"} value={messageProfile.company} /></Field><Field label={language === "he" ? "תפקיד היעד" : "Target role"}><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, role: event.target.value })} placeholder={language === "he" ? "שם התפקיד" : "Role title"} value={messageProfile.role} /></Field><Field label={language === "he" ? "השם שלך" : "Your name"}><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, senderName: event.target.value })} placeholder={language === "he" ? "השם שלך" : "Your name"} value={messageProfile.senderName} /></Field><Field label={language === "he" ? "הערך המקצועי הרלוונטי ביותר" : "Your strongest relevant value"}><input className="form-control" onChange={(event) => setMessageProfile({ ...messageProfile, value: event.target.value })} placeholder={language === "he" ? "לדוגמה: הובלת משאבי אנוש גלובלית" : "e.g. global HR leadership"} value={messageProfile.value} /></Field></div>
              <Field label={language === "he" ? "הקשר אישי (אופציונלי)" : "Personal context (optional)"}><textarea className="form-control min-h-20 resize-y" onChange={(event) => setMessageProfile({ ...messageProfile, context: event.target.value })} placeholder={language === "he" ? "קשר משותף, שיחה קודמת או סיבה ממוקדת לפנייה…" : "A shared connection, recent conversation, or specific reason for reaching out…"} value={messageProfile.context} /></Field>
              <button className="primary-button message-generate-button w-full sm:w-auto" onClick={() => { setGeneratedMessage(generateOutreachMessage(messageProfile)); setNotice(language === "he" ? "טיוטת הפנייה מוכנה ✨" : "Your outreach draft is ready ✨"); }} type="button"><WandSparkles className="h-4 w-4" /> {language === "he" ? "יצירת הפנייה" : "Create my message"}</button>
            </div>
            <div className="message-preview">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-pink-400/10 p-2.5 text-pink-300"><MessagesSquare className="h-5 w-5" /></div><div><h3 className="font-semibold">{language === "he" ? "טיוטת הפנייה שלך" : "Your outreach draft"}</h3><p className="text-xs text-slate-500">{language === "he" ? "אפשר לערוך הכול לפני השליחה" : "Fully editable before sending"}</p></div></div><span className="emoji-bounce text-2xl">💌</span></div>
              {generatedMessage ? <><textarea aria-label={language === "he" ? "טיוטת פנייה" : "Generated outreach message"} className="form-control mt-5 min-h-80 resize-y leading-7" onChange={(event) => setGeneratedMessage(event.target.value)} value={generatedMessage} /><div className="mt-4 flex flex-wrap gap-2"><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(generatedMessage); setNotice(language === "he" ? "ההודעה הועתקה 📋" : "Message copied 📋"); }} type="button"><Copy className="h-4 w-4" /> {language === "he" ? "העתקה" : "Copy"}</button><button className="primary-button bg-pink-500 hover:bg-pink-400" onClick={() => { const subject = `${messageProfile.intent}: ${messageProfile.role || "opportunity"} at ${messageProfile.company || "your company"}`; window.location.href = `mailto:${encodeURIComponent(messageProfile.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generatedMessage)}`; }} type="button"><Send className="h-4 w-4" /> {language === "he" ? "שליחה במייל" : "Send by email"}</button><button className="secondary-button" onClick={planMessageFollowUp} type="button"><CalendarClock className="h-4 w-4" /> {language === "he" ? "תכנון פעולת המשך" : "Plan follow-up"}</button></div><p className="mt-3 text-xs leading-5 text-slate-500">{language === "he" ? "אפליקציית המייל המוגדרת במכשיר תיפתח. לאחר השליחה אפשר לקשר פעולת המשך למועמדות המתאימה." : "Your device will open its default email application. After sending, use Plan follow-up to connect this message back to the matching application."}</p></> : <div className="mt-5 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-pink-400/20 bg-pink-400/5 p-8 text-center"><span className="emoji-bounce text-5xl">🪄</span><p className="mt-5 font-semibold">{language === "he" ? "הפנייה המלוטשת תופיע כאן" : "Your polished message will appear here"}</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{language === "he" ? "השלימו את הפרטים החשובים, בחרו סגנון ו־Carvio תבנה פנייה קצרה, אמינה ומקצועית." : "Complete the essentials, choose a style, and let Carvio shape a concise, credible outreach."}</p></div>}
            </div>
          </div>
          )}
        </section>

        <section className={`calm-view social-studio-panel ${activeView !== "tools" ? "calm-view-hidden" : ""}`} id="social-studio">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 text-8xl opacity-10">📣</div>
          <div className="section-heading relative">
            <div>
              <p className="eyebrow flex items-center gap-2 text-orange-300"><span className="emoji-bounce">✨</span> {language === "he" ? "סטודיו פוסטים חכם" : "Smart Post Studio"}</p>
              <h2 className="section-title">{language === "he" ? "הפכו רעיון לפוסט שאנשים ירצו לקרוא" : "Turn an idea into a post people want to read"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{language === "he" ? "בחרו פלטפורמה, קהל, מטרה וטון. Carvio תיצור טיוטה מותאמת שתוכלו לערוך, לשתף ולפרסם." : "Choose the platform, audience, purpose and tone. Carvio creates a platform-aware draft you can edit, share and publish."}</p>
            </div>
            <button aria-expanded={expandedTools.social} className="secondary-button" onClick={() => setExpandedTools((current) => ({ ...current, social: !current.social, studio: false, cv: false }))} type="button">{expandedTools.social ? (language === "he" ? "סגירת הסטודיו" : "Close studio") : (language === "he" ? "פתיחת הסטודיו" : "Open studio")}<ChevronDown className={`h-4 w-4 transition ${expandedTools.social ? "rotate-180" : ""}`} /></button>
          </div>
          {expandedTools.social && (
            <div className="relative mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-5">
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-200">{language === "he" ? "1. איפה מפרסמים?" : "1. Where are you posting?"}</legend>
                  <div className="mt-3 grid grid-cols-3 gap-2">{([["LinkedIn", "💼"], ["Instagram", "📸"], ["Facebook", "💬"]] as [SocialPlatform, string][]).map(([platform, emoji]) => <button aria-pressed={postProfile.platform === platform} className={`social-platform-card ${postProfile.platform === platform ? "social-platform-card-active" : ""}`} key={platform} onClick={() => setPostProfile({ ...postProfile, platform })} type="button"><span className="text-2xl">{emoji}</span><span>{platform}</span></button>)}</div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={language === "he" ? "נושא הפוסט" : "Post topic"}><input className="form-control" onChange={(event) => setPostProfile({ ...postProfile, topic: event.target.value })} placeholder={language === "he" ? "למשל: מנהיגות בתקופה של שינוי" : "e.g. Leading through change"} value={postProfile.topic} /></Field>
                  <Field label={language === "he" ? "למי הפוסט מיועד?" : "Who should this resonate with?"}><input className="form-control" onChange={(event) => setPostProfile({ ...postProfile, audience: event.target.value })} placeholder={language === "he" ? "מנהלים, אנשי HR, מחפשי עבודה..." : "Leaders, HR peers, job seekers…"} value={postProfile.audience} /></Field>
                  <Field label={language === "he" ? "מטרת הפוסט" : "Post goal"}><select className="form-control" onChange={(event) => setPostProfile({ ...postProfile, goal: event.target.value as PostProfile["goal"] })} value={postProfile.goal}>{(["Share expertise", "Tell a story", "Start a conversation", "Celebrate a milestone", "Job-search visibility"] as PostProfile["goal"][]).map((goal) => <option key={goal} value={goal}>{language === "he" ? ({ "Share expertise": "שיתוף מומחיות", "Tell a story": "סיפור אישי", "Start a conversation": "פתיחת שיחה", "Celebrate a milestone": "ציון הישג", "Job-search visibility": "חשיפה בחיפוש עבודה" } as Record<PostProfile["goal"], string>)[goal] : goal}</option>)}</select></Field>
                  <Field label={language === "he" ? "אורך" : "Length"}><select className="form-control" onChange={(event) => setPostProfile({ ...postProfile, length: event.target.value as PostProfile["length"] })} value={postProfile.length}><option value="Short">{language === "he" ? "קצר" : "Short"}</option><option value="Medium">{language === "he" ? "בינוני" : "Medium"}</option><option value="Long">{language === "he" ? "ארוך" : "Long"}</option></select></Field>
                </div>
                <fieldset><legend className="text-sm font-semibold text-slate-200">{language === "he" ? "2. בחירת סגנון" : "2. Choose the voice"}</legend><div className="mt-3 flex flex-wrap gap-2">{(["Thoughtful", "Bold", "Warm", "Practical", "Inspirational"] as PostProfile["tone"][]).map((tone) => <button aria-pressed={postProfile.tone === tone} className={`message-pill ${postProfile.tone === tone ? "message-pill-active" : ""}`} key={tone} onClick={() => setPostProfile({ ...postProfile, tone })} type="button">{language === "he" ? ({ Thoughtful: "מעורר מחשבה", Bold: "נועז", Warm: "חם ואישי", Practical: "מעשי", Inspirational: "מעורר השראה" } as Record<PostProfile["tone"], string>)[tone] : tone}</button>)}</div></fieldset>
                <Field label={language === "he" ? "המסר המרכזי" : "The one point people should remember"}><textarea className="form-control min-h-24 resize-y" onChange={(event) => setPostProfile({ ...postProfile, keyPoint: event.target.value })} placeholder={language === "he" ? "כתבו במשפט אחד מה תרצו שהקורא ייקח מהפוסט" : "Write the core takeaway in one sentence"} value={postProfile.keyPoint} /></Field>
                <Field label={language === "he" ? "קריאה לפעולה (אופציונלי)" : "Call to action (optional)"}><input className="form-control" onChange={(event) => setPostProfile({ ...postProfile, callToAction: event.target.value })} placeholder={language === "he" ? "למשל: מה דעתכם?" : "e.g. What do you think?"} value={postProfile.callToAction} /></Field>
                <button className="primary-button social-generate-button w-full sm:w-auto" onClick={createPostDraft} type="button"><WandSparkles className="h-4 w-4" /> {language === "he" ? "יצירת פוסט" : "Create my post"}</button>
              </div>
              <div className="social-preview">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-orange-300">{postProfile.platform} preview</p><h3 className="mt-1 font-semibold">{language === "he" ? "הפוסט שלך" : "Your post draft"}</h3><p className="mt-1 text-xs text-slate-500">{language === "he" ? "אפשר לערוך כל מילה לפני הפרסום" : "Edit every word before publishing"}</p></div><span className="text-3xl">{postProfile.platform === "LinkedIn" ? "💼" : postProfile.platform === "Instagram" ? "📸" : "💬"}</span></div>
                <textarea aria-label="Social post draft" className="form-control mt-5 min-h-96 resize-y text-base leading-7" onChange={(event) => setGeneratedPost(event.target.value)} placeholder={language === "he" ? "אפשר לכתוב כאן פוסט באופן עצמאי, או להשתמש באשף ליצירת טיוטה." : "Write your own post here, or use the assistant to create a draft."} value={generatedPost} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="secondary-button" disabled={!generatedPost.trim()} onClick={() => { void navigator.clipboard.writeText(generatedPost); setNotice(language === "he" ? "הפוסט הועתק 📋" : "Post copied 📋"); }} type="button"><Copy className="h-4 w-4" /> {language === "he" ? "העתקה" : "Copy"}</button>
                  <button className="primary-button bg-orange-500 hover:bg-orange-400" disabled={!generatedPost.trim()} onClick={() => { void sharePost(); }} type="button"><Send className="h-4 w-4" /> {language === "he" ? "שיתוף מהטלפון" : "Share from device"}</button>
                  <button className="secondary-button" onClick={() => { void openSocialPlatform(); }} type="button"><ExternalLink className="h-4 w-4" /> {language === "he" ? `פתיחת ${postProfile.platform}` : `Open ${postProfile.platform}`}</button>
                </div>
                <div className="mt-4 rounded-xl border border-orange-400/15 bg-orange-400/5 p-3 text-xs leading-5 text-slate-400"><strong className="text-orange-200">{language === "he" ? "פרסום בשליטתך:" : "You stay in control:"}</strong> {language === "he" ? "Carvio תעתיק את הפוסט ותפתח את הפלטפורמה. מטעמי פרטיות ובטיחות, רק אתם מאשרים את הפרסום הסופי." : "Carvio copies the post and opens the platform. For privacy and safety, only you approve the final publication."}</div>
              </div>
            </div>
          )}
        </section>

        <section className={`calm-view panel overflow-hidden ${activeView !== "tools" ? "calm-view-hidden" : ""}`} id="cv-lab">
          <div className="section-heading">
            <div><p className="eyebrow flex items-center gap-2 text-emerald-300"><span className="emoji-bounce">📄</span> {copy.cv}</p><h2 className="section-title">{language === "he" ? "הפכו כל גרסה של קורות החיים לסיפור מקצועי חזק יותר" : "Turn every CV version into a stronger story"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{language === "he" ? "שמרו עד שש גרסאות, קבלו בדיקת מבנה פרטית ובנו שכתוב אמין בלי להמציא ניסיון." : "Keep up to six versions, receive a private structure review, and build a grounded rewrite without inventing experience."}</p></div>
            <div className="flex flex-wrap items-center gap-2"><label className={`primary-button ${resumes.length >= 6 || resumeProcessing ? "pointer-events-none opacity-50" : ""}`}>{resumeProcessing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} {language === "he" ? (resumeProcessing ? "קורא את קורות החיים…" : "העלאת קורות חיים") : (resumeProcessing ? "Reading CV…" : "Upload CV")}<input accept=".pdf,.docx,.txt,.md,.rtf,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={resumes.length >= 6 || resumeProcessing} multiple onChange={(event) => { void uploadResumes(event.target.files); event.target.value = ""; }} type="file" /></label><button aria-expanded={expandedTools.cv} className="secondary-button" onClick={() => setExpandedTools((current) => ({ ...current, cv: !current.cv, studio: false, social: false }))} type="button">{language === "he" ? (expandedTools.cv ? "הסתרת הבדיקה" : "פתיחת מעבדת קורות החיים") : (expandedTools.cv ? "Hide review" : "Explore CV Lab")}<ChevronDown className={`h-4 w-4 transition ${expandedTools.cv ? "rotate-180" : ""}`} /></button></div>
          </div>
          {expandedTools.cv && (
          <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-400">{language === "he" ? "גרסאות שמורות" : "Saved versions"}</span><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">{resumes.length}/6</span></div>
              {resumes.length === 0 ? <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-emerald-400/5 p-8 text-center"><FileText className="mx-auto h-9 w-9 text-emerald-300" /><p className="mt-3 font-medium">{language === "he" ? "העלאת קורות החיים הראשונים" : "Upload your first CV"}</p><p className="mt-2 text-sm leading-6 text-slate-400">{language === "he" ? "קובצי PDF, Word וטקסט נקראים באופן פרטי במכשיר ומנותחים אוטומטית." : "PDF, Word and text CVs are read privately on this device and reviewed automatically."}</p></div> : resumes.map((resume) => <button className={`content-card flex w-full items-center gap-3 text-left ${selectedResumeId === resume.id ? "border-emerald-400/35 bg-emerald-400/5" : ""}`} key={resume.id} onClick={() => selectResume(resume)} type="button"><div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><FileCheck2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-100">{resume.name}</p><p className="mt-1 text-xs text-slate-500">{formatFileSize(resume.size)} · {language === "he" ? (resume.extractedText ? "מוכן לבדיקה ✨" : "נדרש טקסט לעריכה") : (resume.extractedText ? "Review ready ✨" : "Needs editable text")}</p></div><span className="icon-button h-8 w-8" onClick={(event) => { event.stopPropagation(); removeResume(resume); }} role="button" tabIndex={0}><X className="h-4 w-4" /></span></button>)}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
              <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-400/10 p-2.5 text-violet-300"><WandSparkles className="h-5 w-5" /></div><div><h3 className="font-semibold">{language === "he" ? "בדיקה מקצועית של קורות החיים ✨" : "Professional CV review ✨"}</h3><p className="text-xs text-slate-500">{language === "he" ? "בדיקת פיילוט פרטית, מבוססת כללים, במכשיר הזה" : "Private, rules-based pilot review on this device"}</p></div></div>
              {resumeText ? <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-200"><CheckCircle2 className="h-4 w-4" /> CV content read successfully</p><p className="mt-1 text-xs leading-5 text-slate-400">Your professional review below was created automatically from the uploaded file. The text stays on this device.</p></div> : <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-sm font-semibold text-amber-200">This file does not contain readable text</p><p className="mt-1 text-xs leading-5 text-slate-400">This can happen with scanned PDFs or unsupported formats. Paste the text below to receive the same review.</p></div>}
              <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-slate-400 hover:text-slate-200">View or edit extracted CV text</summary><Field label="CV text for review"><textarea className="form-control mt-1 min-h-44 resize-y" onChange={(event) => setResumeText(event.target.value)} placeholder="Paste CV text here if the file is scanned or could not be read." value={resumeText} /></Field></details>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{reviewResumeText(resumeText).map((item, index) => <div className="insight-box" key={item}><p className="text-xs font-semibold text-cyan-300">{index === 0 ? "Top observation" : `Review point ${index + 1}`}</p><p className="mt-2 text-sm leading-6 text-slate-300">{item}</p></div>)}</div>
              <div className="mt-5 flex flex-wrap items-center gap-3"><button className="primary-button bg-violet-500 hover:bg-violet-400" onClick={createRewriteDraft} type="button"><WandSparkles className="h-4 w-4" /> Create rewrite workspace</button><span className="text-xs leading-5 text-slate-500">Generative AI is not claimed in this local pilot; a secure server connection is required before AI rewriting can be enabled.</span></div>
              {rewriteDraft && <div className="mt-5"><Field label="Improved working draft"><textarea className="form-control min-h-64 resize-y" onChange={(event) => setRewriteDraft(event.target.value)} value={rewriteDraft} /></Field><button className="secondary-button mt-3" onClick={() => { void navigator.clipboard.writeText(rewriteDraft); setNotice("Rewrite draft copied."); }} type="button">📋 Copy draft</button></div>}
            </div>
          </div>
          )}
        </section>

        <section className={`calm-view panel overflow-hidden job-search-panel ${activeView !== "search" ? "calm-view-hidden" : ""}`} id="job-search">
          <div className="job-search-heading">
            <div>
              <p className="eyebrow flex items-center gap-2 text-sky-300"><span className="emoji-bounce">✨</span> {language === "he" ? "חיפוש ממוקד־מיקום ועדכני" : "Fresh, location-first search"}</p>
              <h2 className="section-title">{language === "he" ? "פחות תוצאות אקראיות. יותר משרות ששווה לבדוק." : "Fewer random listings. More roles worth checking."}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{language === "he" ? "Carvio שולח לכל מקור את התפקיד, העיר, המדינה ומועד הפרסום כמסננים נפרדים — ומעדיף מקורות רשמיים שבהם קל יותר לוודא שהמשרה עדיין פתוחה." : "Carvio sends role, city, country and posting age as separate filters—and prioritizes official career pages where availability is easier to confirm."}</p>
            </div>
            <div className="search-quality-card">
              <div><ShieldCheck className="h-5 w-5" /><span>{language === "he" ? "הגנת טריות" : "Freshness guard"}</span></div>
              <strong>{searchProfile.datePosted === "Past 24 hours" ? (language === "he" ? "חזק" : "Strong") : searchProfile.datePosted === "Past week" ? (language === "he" ? "טוב" : "Good") : (language === "he" ? "רחב" : "Broad")}</strong>
              <small>{language === "he" ? "מקורות רשמיים מוצגים ראשונים" : "Official sources appear first"}</small>
            </div>
          </div>

          {expandedTools.search && (<div className={`advanced-section-body mobile-search-flow mobile-search-flow-${searchStep}`}>

          <div className="search-steps" aria-label={language === "he" ? "שלבי החיפוש" : "Search steps"}>
            <button aria-current={searchStep === 1 ? "step" : undefined} onClick={() => setSearchStep(1)} type="button"><span>1</span><p><strong>{language === "he" ? "מגדירים" : "Define"}</strong><small>{language === "he" ? "תפקיד ומיקום" : "Role and location"}</small></p></button>
            <i />
            <button aria-current={searchStep === 2 ? "step" : undefined} onClick={() => setSearchStep(2)} type="button"><span>2</span><p><strong>{language === "he" ? "מדייקים" : "Refine"}</strong><small>{language === "he" ? "טריות ומסננים" : "Freshness and filters"}</small></p></button>
            <i />
            <button aria-current={searchStep === 3 ? "step" : undefined} onClick={() => setSearchStep(3)} type="button"><span>3</span><p><strong>{language === "he" ? "מחפשים" : "Search"}</strong><small>{language === "he" ? "מקור אמין" : "Trusted source"}</small></p></button>
          </div>

          <div className="search-lock-card">
            <div className="search-lock-icon">📍</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{language === "he" ? "החיפוש הנוכחי" : "Current search lock"}</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{resolvedSearch.role || (language === "he" ? "בחרו תפקיד" : "Choose a target role")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span>📍 {resolvedSearch.location || (language === "he" ? "בחרו עיר ומדינה" : "Choose city and country")}</span>
                <span>◎ {searchProfile.radius} km</span>
                <span>🕒 {searchProfile.datePosted}</span>
              </div>
              {searchProfile.role.match(/\s+in\s+/i) && !searchProfile.location && <p className="mt-2 text-xs text-amber-300">✓ {language === "he" ? "זיהינו את המיקום בתוך שדה התפקיד והפרדנו אותו אוטומטית." : "We detected the location inside your role entry and separated it automatically."}</p>}
            </div>
          </div>

          <div className={`search-form-grid search-step-${searchStep} mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3`} id="search-form-fields">
            <Field label="Target role"><input className="form-control" list="carvio-role-options" onChange={(event) => updateSearchRole(event.target.value)} placeholder="e.g. Supply Chain Manager" value={searchProfile.role} /><datalist id="carvio-role-options">{roleSuggestions.map((role) => <option key={role} value={role} />)}</datalist></Field>
            <Field label="Country"><select className="form-control" onChange={(event) => updateSearchProfile({ country: event.target.value, location: "" })} value={searchProfile.country}>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></Field>
            <Field label={language === "he" ? "עיר או אזור (אופציונלי)" : "City / area (optional)"}><input className="form-control" list="carvio-city-options" onChange={(event) => updateSearchProfile({ location: event.target.value })} placeholder={language === "he" ? "למשל אמסטרדם — ניתן להשאיר ריק" : "e.g. Amsterdam — leave blank for country-wide"} value={searchProfile.location} /><datalist id="carvio-city-options">{(citySuggestions[searchProfile.country] || []).map((city) => <option key={city} value={city} />)}</datalist></Field>
            <Field label="Search radius"><select className="form-control" onChange={(event) => updateSearchProfile({ radius: event.target.value })} value={searchProfile.radius}>{["5", "10", "25", "50", "100"].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></Field>
            <Field label="Seniority"><select className="form-control" onChange={(event) => updateSearchProfile({ seniority: event.target.value })} value={searchProfile.seniority}><option value="">Any level</option><option>Entry level</option><option>Associate</option><option>Mid-Senior level</option><option>Director</option><option>Executive</option></select></Field>
            <Field label="Employment type"><select className="form-control" onChange={(event) => updateSearchProfile({ employmentType: event.target.value })} value={searchProfile.employmentType}><option value="">Any type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option><option>Internship</option></select></Field>
            <Field label="Work model"><select className="form-control" onChange={(event) => updateSearchProfile({ workModel: event.target.value })} value={searchProfile.workModel}><option value="">Any model</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select></Field>
            <Field label={language === "he" ? "מועד פרסום" : "Date posted"}><select className="form-control" onChange={(event) => updateSearchProfile({ datePosted: event.target.value })} value={searchProfile.datePosted}><option>Past 24 hours</option><option>Past week</option><option>Past month</option><option>Any time</option></select></Field>
            <Field label="Industry"><input className="form-control" onChange={(event) => updateSearchProfile({ industry: event.target.value })} placeholder="SaaS, healthcare, retail…" value={searchProfile.industry} /></Field>
          </div>
          <div className="mobile-step-actions"><button className="secondary-button" disabled={searchStep === 1} onClick={() => setSearchStep((current) => Math.max(1, current - 1) as 1 | 2 | 3)} type="button">{language === "he" ? "חזרה" : "Back"}</button>{searchStep < 3 && <button className="primary-button" onClick={() => setSearchStep((current) => Math.min(3, current + 1) as 1 | 2 | 3)} type="button">{language === "he" ? "המשך" : "Continue"}<ChevronRight className="h-4 w-4" /></button>}</div>

          <fieldset className="mt-5"><legend className="text-sm font-medium text-slate-200">Skills — select or type your own</legend><div className="mt-3 flex flex-wrap gap-2">{skillSuggestions.map((skill) => { const selected = searchProfile.skills.split(",").map((item) => item.trim().toLowerCase()).includes(skill.toLowerCase()); return <button aria-pressed={selected} className={`skill-chip ${selected ? "skill-chip-selected" : ""}`} key={skill} onClick={() => toggleSearchSkill(skill)} type="button">{selected ? "✓ " : "+ "}{skill}</button>; })}</div><input aria-label="Additional skills" className="form-control mt-3" onChange={(event) => updateSearchProfile({ skills: event.target.value })} placeholder="Additional skills, separated by commas" value={searchProfile.skills} /></fieldset>

          <div className="freshness-shortcuts" aria-label={language === "he" ? "בחירת טריות מהירה" : "Quick freshness selection"}>
            <span>{language === "he" ? "כמה עדכני?" : "How fresh?"}</span>
            {["Past 24 hours", "Past week", "Past month"].map((value) => <button aria-pressed={searchProfile.datePosted === value} className={searchProfile.datePosted === value ? "freshness-active" : ""} key={value} onClick={() => updateSearchProfile({ datePosted: value })} type="button">{value === "Past 24 hours" ? (language === "he" ? "24 שעות · מומלץ" : "24 hours · Recommended") : value === "Past week" ? (language === "he" ? "שבוע" : "Past week") : (language === "he" ? "חודש" : "Past month")}</button>)}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto]"><Field label="Exclude keywords"><input className="form-control" onChange={(event) => updateSearchProfile({ exclude: event.target.value })} placeholder="sales, internship, junior…" value={searchProfile.exclude} /></Field><button className="secondary-button self-end" disabled={!resolvedSearch.role || !resolvedSearch.country} onClick={saveSearchAsApplication} type="button"><Plus className="h-4 w-4" /> {language === "he" ? "שמירה למועמדויות" : "Save to Applications"}</button><button className="primary-button search-launch-button self-end px-7" disabled={!resolvedSearch.role || !resolvedSearch.country} onClick={runJobSearch} type="button"><Search className="h-4 w-4" /> {language === "he" ? `חיפוש ב${resolvedSearch.city || resolvedSearch.country || "מיקום"}` : `Search ${resolvedSearch.city || resolvedSearch.country || "location"}`}</button></div>
          {!resolvedSearch.country && <p className="mt-2 text-xs text-amber-300">{language === "he" ? "יש לבחור מדינה. העיר אופציונלית." : "Choose a country. City is optional."}</p>}

          {showSearchResults && submittedSearchProfile && <div className="search-results-shell" id="search-results"><div className="search-results-heading"><div><p className="font-semibold text-slate-200">{language === "he" ? `מסלולי חיפוש עדכניים עבור ${submittedSearch.role}` : `Fresh search routes for ${submittedSearch.role}`}</p><p className="text-sm text-slate-500">{submittedSearch.location} · {submittedSearchProfile.radius} km · {submittedSearchProfile.datePosted}</p></div><span><ShieldCheck className="h-4 w-4" />{language === "he" ? "בדיקה במקור" : "Verify at source"}</span></div><div className="search-source-grid">{jobSearchSources(submittedSearchProfile).map((source, index) => <a className={`search-source-card group ${source.featured ? "search-source-featured" : ""}`} href={source.url} key={source.name} rel="noreferrer" target="_blank"><div className="flex items-center justify-between"><span className="search-source-icon">{source.emoji}</span>{source.featured ? <span className="search-source-recommended">{language === "he" ? "מומלץ להתחיל כאן" : "Start here"}</span> : <span className="search-source-rank">0{index + 1}</span>}</div><p className="mt-4 font-semibold text-slate-100">{source.name}</p><div className="search-source-signals"><span>🕒 {source.freshness}</span><span>📍 {source.accuracy}</span></div><p className="mt-3 text-sm leading-6 text-slate-400">{source.description}</p><span className="search-source-open">{language === "he" ? "פתיחת תוצאות במקור" : "Open results at source"}<ArrowUpRight className="h-3.5 w-3.5" /></span></a>)}</div>
          {showCompanySearchLeads && <section className="job-inbox"><div className="job-inbox-heading"><div><p className="eyebrow text-emerald-300">{language === "he" ? "תיבת המשרות" : "Job inbox"}</p><h3>{language === "he" ? "נקודות פתיחה מותאמות לפרופיל שלך" : "Profile-matched starting points"}</h3><p>{language === "he" ? "Carvio מרכז מסלולי חיפוש ממוקדים, מסיר כפילויות ומאפשר לשמור כל הזדמנות. יש לאמת שהמשרה פעילה באתר המקור." : "Carvio organizes focused search leads, removes duplicates, and lets you save each opportunity. Always verify availability at the source."}</p></div><span>{jobInbox.length} {language === "he" ? "הצעות" : "leads"}</span></div><div className="job-inbox-list">{jobInbox.map((item) => { const saved = applications.some((application) => application.company.toLowerCase() === item.company.toLowerCase() && application.role.toLowerCase() === item.role.toLowerCase()); return <article className="job-inbox-card" key={item.id}><div className="job-inbox-logo">{item.company.slice(0, 1)}</div><div className="job-inbox-main"><div><strong>{item.role}</strong><span>{item.company} · {item.location}</span></div><p><span>🎯 {item.match}% {language === "he" ? "התאמה" : "match"}</span><span>🕒 {item.posted}</span><span>🔗 {item.source}</span></p><small>{item.reason}</small></div><div className="job-inbox-actions">{saved ? <span className="job-inbox-saved"><CheckCircle2 className="h-4 w-4" />{language === "he" ? "במועמדויות" : "In Applications"}</span> : <><button onClick={() => saveInboxJob(item)} type="button"><Plus className="h-4 w-4" />{language === "he" ? "שמירה" : "Save"}</button><button onClick={() => saveInboxJob(item, true)} type="button">{language === "he" ? "כבר הגשתי" : "Already applied"}</button></>}<a href={item.url} rel="noreferrer" target="_blank">{language === "he" ? "בדיקה במקור" : "Verify & apply"}<ArrowUpRight className="h-4 w-4" /></a><button aria-label={language === "he" ? "הסתרת ההצעה" : "Hide lead"} onClick={() => setHiddenJobIds((items) => [...items, item.id])} type="button"><X className="h-4 w-4" /></button></div></article>; })}</div></section>}
          <div className="search-honesty-note"><CircleAlert className="h-5 w-5" /><div><strong>{language === "he" ? "מדוע עדיין חשוב לבדוק את המשרה?" : "Why should you still verify the listing?"}</strong><p>{language === "he" ? "Carvio מחיל מסנני מיקום וטריות, אך LinkedIn ו-Google עשויים להציג גם המלצות ממומנות או מותאמות אישית. פתיחת אתר החברה היא הבדיקה הטובה ביותר לכך שהמשרה עדיין פעילה." : "Carvio applies location and freshness filters, but LinkedIn and Google may still insert sponsored or personalized suggestions. The company career page remains the strongest confirmation that a role is open."}</p></div></div></div>}
          </div>)}
        </section>

        <section className={`calm-view panel ${activeView !== "more" ? "calm-view-hidden" : ""}`} id="analytics">
          <div className="insights-command">
            <div className="insights-command-copy">
              <p className="eyebrow flex items-center gap-2 text-violet-300"><TrendingUp className="h-4 w-4" /> {language === "he" ? "מרכז התובנות" : "Insights command center"}</p>
              <h2>{language === "he" ? "המספרים שלכם, מתורגמים להחלטות." : "Your numbers, translated into decisions."}</h2>
              <p>{language === "he" ? "תמונת מצב חיה של התהליך — ומה כדאי לעשות עכשיו כדי לייצר תנופה." : "A live view of your search—and the clearest move to create momentum now."}</p>
              <button className="primary-button" onClick={() => navigateToSection(todayFocus.target)} type="button"><Zap className="h-4 w-4" />{language === "he" ? "לביצוע הפעולה המומלצת" : "Take the recommended action"}</button>
            </div>
            <div className="insights-command-focus">
              <span>{language === "he" ? "הפעולה החשובה עכשיו" : "Most important now"}</span>
              <strong>{todayFocus.title}</strong>
              <small>{todayFocus.detail}</small>
              <div><i style={{ width: `${weeklyMomentum.progress}%` }} /></div>
              <p>{language === "he" ? `${weeklyMomentum.total} מתוך ${weeklyMomentum.goal} פעולות משמעותיות השבוע` : `${weeklyMomentum.total} of ${weeklyMomentum.goal} meaningful moves this week`}</p>
            </div>
          </div>
          <div className="insights-kpi-grid">
            {[
              { label: language === "he" ? "מועמדויות פעילות" : "Active applications", value: applications.filter((item) => !["Rejected", "Withdrawn"].includes(item.status)).length, icon: "💼" },
              { label: language === "he" ? "בשלב ראיון" : "Interview stage", value: applications.filter((item) => item.status === "Interview").length, icon: "🎙️" },
              { label: language === "he" ? "הצעות" : "Offers", value: applications.filter((item) => item.status === "Offer").length, icon: "✨" },
              { label: language === "he" ? "פעולות באיחור" : "Overdue actions", value: analytics.followUps[0].value, icon: "⏰" },
              { label: language === "he" ? "קשרים מקצועיים" : "Network contacts", value: contacts.length, icon: "🤝" },
            ].map((item) => <div className="insights-kpi" key={item.label}><span>{item.icon}</span><strong>{item.value}</strong><small>{item.label}</small></div>)}
          </div>
          <div className="section-heading analytics-section-heading">
            <div><p className="eyebrow text-cyan-300">{language === "he" ? "ניתוח מעמיק" : "Deeper analysis"}</p><h3 className="section-title">{language === "he" ? "כל גרף מוביל לתובנה ולפעולה" : "Every chart leads to an insight and action"}</h3></div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">{language === "he" ? "חי · מבוסס על המכשיר הזה" : "Live · based on this device"}</span><button aria-expanded={expandedTools.analytics} className="secondary-button" onClick={() => setExpandedTools((current) => ({ ...current, analytics: !current.analytics }))} type="button">{expandedTools.analytics ? (language === "he" ? "הסתרת הגרפים" : "Hide charts") : (language === "he" ? "הצגת כל הניתוחים" : "Explore analytics")}<ChevronDown className={`h-4 w-4 transition ${expandedTools.analytics ? "rotate-180" : ""}`} /></button></div>
          </div>
          <div className="mobile-insight-tabs" role="tablist" aria-label={language === "he" ? "קטגוריית תובנות" : "Insight category"}>
            {([["pipeline", language === "he" ? "משפך" : "Pipeline"], ["activity", language === "he" ? "פעילות" : "Activity"], ["networking", language === "he" ? "קשרים" : "Network"]] as const).map(([value, label]) => <button aria-selected={mobileInsightCategory === value} key={value} onClick={() => setMobileInsightCategory(value)} role="tab" type="button">{label}</button>)}
          </div>
          {expandedTools.analytics && (
          <div className={`analytics-grid mobile-insights-${mobileInsightCategory} mt-6`}>
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
            <AnalyticsCard
              title={language === "he" ? "בריאות שלבי התהליך" : "Process-stage health"}
              subtitle={language === "he" ? "מה קורה בתוך כל ראיון ושלב" : "What is happening inside every interview and stage"}
              icon={<span className="text-lg">🚦</span>}
              insight={analytics.stageSignals.reduce((sum, item) => sum + item.value, 0)
                ? (language === "he"
                  ? `${analytics.stageSignals.find((item) => item.value === Math.max(...analytics.stageSignals.map((signal) => signal.value)))?.label} הוא הסימון הנפוץ ביותר בשלבים שתועדו.`
                  : `${analytics.stageSignals.find((item) => item.value === Math.max(...analytics.stageSignals.map((signal) => signal.value)))?.label} is the most common signal across recorded stages.`)
                : (language === "he" ? "עדיין לא תועדו שלבי תהליך. הם יופיעו כאן מיד לאחר ההוספה." : "No process stages have been recorded yet. They will appear here as soon as you add them.")}
              recommendation={analytics.stageSignals.find((item) => item.label === "Waiting")?.value
                ? (language === "he" ? "עברו על השלבים הצהובים והגדירו לכל אחד מועד ברור לבדיקת סטטוס." : "Review waiting stages and give each one a clear date for checking the status.")
                : (language === "he" ? "סמנו כל שלב מיד לאחר שיחה כדי לקבל תמונה אמינה של התהליך." : "Mark every stage after each conversation to keep the journey accurate.")}
            >
              <RadarChart data={analytics.stageSignals} />
            </AnalyticsCard>
            <AnalyticsCard
              title={language === "he" ? "מטריצת איכות הזדמנויות" : "Opportunity quality matrix"}
              subtitle={language === "he" ? "התאמה מול התקדמות — כדי לדעת היכן להשקיע" : "Fit versus progress—so you know where to invest"}
              icon={<span className="text-lg">🎯</span>}
              insight={analytics.highFitOpportunities.length
                ? (language === "he"
                  ? `${analytics.highFitOpportunities[0].company} היא כרגע ההזדמנות החזקה ביותר: התאמה גבוהה והתקדמות של ממש.`
                  : `${analytics.highFitOpportunities[0].company} is currently your strongest opportunity: high fit with meaningful progress.`)
                : (language === "he" ? "עדיין אין הזדמנות פעילה שסומנה כהתאמה גבוהה." : "No active opportunity is marked as high fit yet.")}
              recommendation={analytics.highFitWaiting
                ? (language === "he"
                  ? `תנו עדיפות ל־${analytics.highFitWaiting.company}: זו משרה בהתאמה גבוהה שממתינה לפעולה או לעדכון.`
                  : `Prioritize ${analytics.highFitWaiting.company}: it is a high-fit role waiting for an action or update.`)
                : analytics.highFitOpportunities.length
                  ? (language === "he"
                    ? `הקדישו את זמן ההכנה הבא ל־${analytics.highFitOpportunities[0].company} לפני הוספת מועמדויות חדשות.`
                    : `Use your next preparation block for ${analytics.highFitOpportunities[0].company} before adding more applications.`)
                  : (language === "he" ? "סמנו רמת התאמה בכל משרה כדי שהמערכת תוכל לתעדף עבורכם." : "Set a fit level on each role so Carvio can prioritize your effort.")}
            >
              <OpportunityMatrix data={analytics.opportunityMatrix} language={language} />
            </AnalyticsCard>
            <AnalyticsCard
              title={language === "he" ? "משפך ההתקדמות" : "Progression funnel"}
              subtitle={language === "he" ? "ממועמדות לראיון ולהצעת עבודה" : "From application to interview and offer"}
              icon={<TrendingUp className="h-5 w-5" />}
              insight={applications.length
                ? (language === "he"
                  ? `${analytics.conversionFunnel[1].value} מתוך ${analytics.conversionFunnel[0].value} מועמדויות הגיעו לראיון, ו־${analytics.conversionFunnel[2].value} להצעה.`
                  : `${analytics.conversionFunnel[1].value} of ${analytics.conversionFunnel[0].value} applications reached interview, and ${analytics.conversionFunnel[2].value} reached offer.`)
                : (language === "he" ? "המשפך ייבנה אוטומטית כאשר תוסיפו מועמדויות." : "Your funnel will form automatically as you add applications.")}
              recommendation={analytics.conversionFunnel[0].value >= 5 && analytics.conversionFunnel[1].value === 0
                ? (language === "he" ? "כדאי לעצור הגשות בכמות ולחדד התאמה, קורות חיים ופנייה ישירה לפני הסבב הבא." : "Pause volume applications and sharpen fit, résumé positioning, and direct outreach before the next batch.")
                : analytics.conversionFunnel[1].value > 0 && analytics.conversionFunnel[2].value === 0
                  ? (language === "he" ? "המשפך מגיע לראיונות. התמקדו בהכנת סיפורי STAR, מחקר חברה וסיכום למידה אחרי כל שיחה." : "Your funnel reaches interviews. Focus on STAR stories, company research, and a short learning review after each conversation.")
                  : (language === "he" ? "בדקו את המשפך אחת לשבוע וחפשו את המעבר שבו נדרשת פעולה ממוקדת." : "Review the funnel weekly and focus on the transition that needs the most support.")}
            >
              <FunnelChart data={analytics.conversionFunnel} />
            </AnalyticsCard>
          </div>
          )}
        </section>

        <section className={`calm-view panel ${activeView !== "more" ? "calm-view-hidden" : ""}`} id="preferences">
          <div className="section-heading"><div><p className="eyebrow text-cyan-300">{copy.preferences}</p><h2 className="section-title">{copy.preferencesTitle}</h2></div><span className="text-3xl" aria-hidden="true">⚙️</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button className="calm-setting-button" onClick={() => setShowAppearance(!showAppearance)} type="button"><Palette className="h-5 w-5 text-cyan-300" /><span><strong>{copy.appearance}</strong><small>{copy.appearanceHelp}</small></span></button>
            <button className="calm-setting-button" onClick={() => setLanguage(language === "en" ? "he" : "en")} type="button"><Languages className="h-5 w-5 text-violet-300" /><span><strong>{copy.language}</strong><small>{language === "en" ? "Switch to Hebrew" : "מעבר לאנגלית"}</small></span></button>
            <button className="calm-setting-button" onClick={() => setShowTrustCenter(true)} type="button"><ShieldCheck className="h-5 w-5 text-emerald-300" /><span><strong>{copy.privacy}</strong><small>{copy.privacyHelp}</small></span></button>
            <button className="calm-setting-button" onClick={() => { setFeedbackError(""); setShowFeedbackModal(true); }} type="button"><MessageCircleMore className="h-5 w-5 text-amber-300" /><span><strong>{copy.pilotFeedback}</strong><small>{copy.pilotFeedbackHelp}</small></span></button>
            <button className="calm-setting-button" onClick={resetDemoData} type="button"><RotateCcw className="h-5 w-5 text-rose-300" /><span><strong>{copy.resetDemo}</strong><small>{language === "he" ? "חזרה בטוחה לנתוני ההדגמה" : "Safely restore the original demo data"}</small></span></button>
          </div>
          {showAppearance && <div className="appearance-menu calm-appearance-menu"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.choosePalette}</p><div className="grid gap-2 sm:grid-cols-2">{([
            { value: "dark", label: copy.darkForest, colors: ["#07110d", "#166534", "#14b8a6"] },
            { value: "light", label: copy.cleanLight, colors: ["#ffffff", "#e0f2fe", "#059669"] },
            { value: "ocean", label: copy.deepOcean, colors: ["#071827", "#075985", "#22d3ee"] },
            { value: "plum", label: copy.warmPlum, colors: ["#211126", "#7e22ce", "#fb7185"] },
          ] as { value: ColorTheme; label: string; colors: string[] }[]).map((option) => <button aria-pressed={theme === option.value} className={`palette-option ${theme === option.value ? "palette-option-active" : ""}`} key={option.value} onClick={() => { selectTheme(option.value); setShowAppearance(false); }} type="button"><span className="flex" aria-hidden="true">{option.colors.map((color) => <span className="h-5 w-5 border border-white/20 first:rounded-s-full last:rounded-e-full" key={color} style={{ backgroundColor: color }} />)}</span><span>{option.label}</span></button>)}</div></div>}
        </section>

        <section className={`calm-view compact-feedback-card ${activeView !== "more" ? "calm-view-hidden" : ""}`} id="pilot-feedback">
          <div><span aria-hidden="true">🧪</span><div><strong>{copy.pilotQuestion}</strong><p>{copy.pilotHelp}</p></div></div>
          <button className="primary-button" onClick={() => { setFeedbackError(""); setShowFeedbackModal(true); }} type="button"><MessageCircleMore className="h-4 w-4" /> {copy.shareFeedback}</button>
        </section>
      </div>

      <nav aria-label="Mobile navigation" className="calm-mobile-nav">
        {([
          ["home", House, copy.overview],
          ["applications", BriefcaseBusiness, copy.applications],
          ["search", Search, copy.search],
          ["networking", Users2, copy.networking],
        ] as [AppView, typeof House, string][]).map(([view, Icon, label]) => <button aria-current={activeView === view ? "page" : undefined} className={`${view === "applications" ? "calm-mobile-applications" : ""} ${activeView === view ? "calm-mobile-tab-active" : ""}`} key={view} onClick={() => switchView(view)} type="button"><Icon className="h-5 w-5" /><span>{label}</span></button>)}
        <button aria-expanded={showMobileMore} className={activeView === "tools" || activeView === "more" ? "calm-mobile-tab-active" : ""} onClick={() => setShowMobileMore((current) => !current)} type="button"><Menu className="h-5 w-5" /><span>{language === "he" ? "עוד" : "More"}</span></button>
        <button aria-label={language === "he" ? "הוספה מהירה" : "Quick add"} className="calm-quick-add" onClick={() => setShowQuickAdd(true)} type="button"><Plus className="h-5 w-5" /></button>
      </nav>
      {showMobileMore && <div className="mobile-more-menu"><button onClick={() => { setShowMobileMore(false); setShowCommandBar(true); }} type="button"><Search className="h-5 w-5" /><span><strong>{language === "he" ? "חיפוש או מעבר מהיר" : "Search or jump"}</strong><small>{language === "he" ? "חיפוש בכל סביבת העבודה" : "Search across your workspace"}</small></span></button><button onClick={() => switchView("tools")} type="button"><Wrench className="h-5 w-5" /><span><strong>{copy.tools}</strong><small>{language === "he" ? "הודעות, פוסטים וקורות חיים" : "Messages, posts and CV"}</small></span></button><button onClick={() => switchView("more")} type="button"><BarChart3 className="h-5 w-5" /><span><strong>{copy.insights}</strong><small>{language === "he" ? "תובנות והפעולה הבאה" : "Insights and next actions"}</small></span></button></div>}

      {notice && <div aria-atomic="true" aria-live="polite" className="toast" role="status"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /><span>{notice}</span><button aria-label="Dismiss notification" className="ml-1 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={() => setNotice("")} type="button"><X className="h-4 w-4" /></button></div>}

      <button aria-label={language === "he" ? "חזרה לראש העמוד ולהגדרות" : "Back to top and settings"} className={`back-to-top ${showBackToTop ? "back-to-top-visible" : ""}`} onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" })} tabIndex={showBackToTop ? 0 : -1} type="button"><ArrowUp className="h-5 w-5" /><span>{language === "he" ? "למעלה" : "Top"}</span></button>

      {showTrustCenter && (
        <Modal title="Your data & privacy 🔒" description="Carvio's pilot stores your information only in this browser. You stay in control." onClose={() => setShowTrustCenter(false)}>
          <div className="space-y-4">
            <div className="trust-status"><ShieldCheck className="h-7 w-7 shrink-0 text-emerald-300" /><div><p className="font-semibold">All changes are saved on this device</p><p className="mt-1 text-sm leading-6 text-slate-400">The founders cannot see your applications, contacts, salary expectations or CV content. This pilot does not synchronize between devices.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><button className="secondary-button min-h-14" onClick={exportCarvioData} type="button"><Download className="h-5 w-5" /> Download backup</button><label className="secondary-button min-h-14"><UploadCloud className="h-5 w-5" /> Restore backup<input accept="application/json,.json" className="sr-only" onChange={(event) => { void importCarvioData(event); }} type="file" /></label></div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-sm leading-6 text-slate-400"><strong className="text-amber-200">Important:</strong> clearing browser data, using private browsing, or switching devices can remove or hide your information. Download a backup regularly during the pilot.</div>
            <div className="border-t border-white/10 pt-4"><button className="text-button text-rose-300 hover:text-rose-200" onClick={deleteAllLocalData} type="button"><Trash2 className="h-4 w-4" /> Delete all Carvio data from this browser</button></div>
          </div>
        </Modal>
      )}

      {showQuickAdd && (
        <Modal title={language === "he" ? "מה תרצו להוסיף? ✨" : "What would you like to add? ✨"} description={language === "he" ? "בחרו פעולה מהירה אחת. תמיד אפשר להשלים פרטים בהמשך." : "Choose one quick action. You can add more details later."} onClose={() => setShowQuickAdd(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="quick-add-card" onClick={() => { setShowQuickAdd(false); openNewApplication(); }} type="button"><span>💼</span><strong>{language === "he" ? "מועמדות" : "Application"}</strong><small>{language === "he" ? "תיעוד הזדמנות חדשה" : "Track a new opportunity"}</small></button>
            <button className="quick-add-card" onClick={() => { setShowQuickAdd(false); openNewContact(); }} type="button"><span>🤝</span><strong>{language === "he" ? "איש קשר" : "Contact"}</strong><small>{language === "he" ? "שמירת קשר מקצועי חשוב" : "Save a warm connection"}</small></button>
            <button className="quick-add-card" onClick={() => { setShowQuickAdd(false); setEditingApplicationId(null); setApplicationDraft({ ...emptyApplication, status: "Interview", eventType: "Interview", nextStep: "Prepare for interview" }); setShowApplicationDetails(true); setShowApplicationModal(true); }} type="button"><span>📅</span><strong>{language === "he" ? "ראיון" : "Interview"}</strong><small>{language === "he" ? "הוספה והכנה רגועה" : "Add it and prepare calmly"}</small></button>
            <button className="quick-add-card" onClick={() => { setShowQuickAdd(false); setEditingApplicationId(null); setApplicationDraft({ ...emptyApplication, status: "Follow-up due", nextStep: "Send a thoughtful follow-up" }); setShowApplicationDetails(false); setShowApplicationModal(true); }} type="button"><span>✉️</span><strong>{language === "he" ? "פעולת המשך" : "Follow-up"}</strong><small>{language === "he" ? "תיעוד הצעד הבא" : "Capture the next move"}</small></button>
          </div>
        </Modal>
      )}

      {showSmartCapture && (
        <Modal title={language === "he" ? "לכידה חכמה של משרה ✨" : "Smart job capture ✨"} description={language === "he" ? "הדביקו קישור למשרה. Carvio יחלץ בבטחה את מה שניתן ויפתח טופס לבדיקה." : "Paste a job link. Carvio will safely extract what it can and open a review form."} onClose={() => setShowSmartCapture(false)}>
          <div className="smart-capture">
            <div className="smart-capture-icon"><WandSparkles className="h-7 w-7" /></div>
            <Field label={language === "he" ? "קישור למשרה" : "Job URL"}><input autoFocus className="form-control" onChange={(event) => { setSmartCaptureUrl(event.target.value); setSmartCaptureError(""); }} onKeyDown={(event) => { if (event.key === "Enter") smartCaptureApplication(); }} placeholder="https://company.com/careers/role…" type="url" value={smartCaptureUrl} /></Field>
            {smartCaptureError && <p className="form-error">{smartCaptureError}</p>}
            <p>{language === "he" ? "לא נמציא פרטים חסרים. לפני השמירה תוכלו להשלים חברה, תפקיד, תאריך ורמזור." : "Carvio never invents missing details. You can review company, role, timing, and signal before saving."}</p>
            <button className="primary-button w-full" onClick={smartCaptureApplication} type="button"><Sparkles className="h-4 w-4" />{language === "he" ? "קליטה ופתיחת טופס" : "Capture and review"}</button>
          </div>
        </Modal>
      )}

      {workspaceApplication && (
        <Modal title={`${workspaceApplication.role} · ${workspaceApplication.company}`} description={language === "he" ? "כל ההקשר, הפעולות וההיסטוריה של ההזדמנות במקום אחד." : "Every action, conversation, and milestone for this opportunity in one place."} onClose={() => setWorkspaceApplicationId(null)} wide>
          <div className="application-workspace">
            <header><span aria-hidden="true" className={`application-company-logo ${workspaceApplication.logoUrl ? "application-company-logo-image" : ""}`} style={workspaceApplication.logoUrl ? { backgroundImage: `url("${workspaceApplication.logoUrl}")` } : undefined}>{workspaceApplication.logoUrl ? "" : workspaceApplication.company.slice(0, 1)}</span><div><span className={statusStyles[workspaceApplication.status]}>{statusLabel(workspaceApplication.status)}</span><h3>{workspaceApplication.role}</h3><p>{workspaceApplication.company}{workspaceApplication.location ? ` · ${workspaceApplication.location}` : ""}</p></div><i className={trafficLightMeta[workspaceApplication.trafficLight].dot} /></header>
            <section className="workspace-next-action"><div><span>⚡ {language === "he" ? "הפעולה הבאה" : "Next best action"}</span><strong>{workspaceApplication.nextStep || (language === "he" ? "הגדירו את הצעד הבא" : "Define the next move")}</strong><small>{workspaceApplication.nextStepDue ? formatDate(workspaceApplication.nextStepDue) : (language === "he" ? "ללא תאריך יעד" : "No due date")}</small></div><div><button onClick={() => completeApplicationAction(workspaceApplication)} type="button"><CheckCircle2 className="h-4 w-4" />{language === "he" ? "בוצע" : "Done"}</button><button onClick={() => snoozeApplication(workspaceApplication)} type="button"><Clock3 className="h-4 w-4" />{language === "he" ? "דחייה" : "Snooze"}</button><button onClick={() => openOutreachForApplication(workspaceApplication)} type="button"><MessagesSquare className="h-4 w-4" />{language === "he" ? "הודעה" : "Message"}</button></div></section>
            <div className="workspace-grid">
              <section><h4>🧭 {language === "he" ? "ציר הזמן" : "Timeline"}</h4><div className="workspace-timeline">{workspaceApplication.appliedDate && <div><i /><span><strong>{language === "he" ? "המועמדות נוספה" : "Application tracked"}</strong><small>{formatDate(workspaceApplication.appliedDate)}</small></span></div>}{workspaceApplication.processStages.map((stage) => <div key={stage.id}><i className={trafficLightMeta[stage.trafficLight].dot} /><span><strong>{stage.name}</strong><small>{stage.date ? formatDate(stage.date) : (language === "he" ? "ללא תאריך" : "No date")}</small></span></div>)}{workspaceApplication.eventDateTime && <div><i /><span><strong>{workspaceApplication.eventType || (language === "he" ? "פגישה" : "Meeting")}</strong><small>{formatDate(workspaceApplication.eventDateTime, true)}</small></span></div>}</div></section>
              <section><h4>🤝 {language === "he" ? "אנשים והקשר" : "People & context"}</h4>{contacts.filter((contact) => contact.company.toLowerCase() === workspaceApplication.company.toLowerCase() || contact.name === workspaceApplication.contactName).length ? contacts.filter((contact) => contact.company.toLowerCase() === workspaceApplication.company.toLowerCase() || contact.name === workspaceApplication.contactName).map((contact) => <button className="workspace-person" key={contact.id} onClick={() => { setWorkspaceApplicationId(null); switchView("networking"); }} type="button"><span>{contact.name.slice(0, 1)}</span><span><strong>{contact.name}</strong><small>{contact.role} · {contact.company}</small></span><ChevronRight className="h-4 w-4" /></button>) : <p className="workspace-empty">{language === "he" ? "עדיין אין איש קשר שמקושר לחברה הזו." : "No contact is linked to this company yet."}</p>}<button className="text-button" onClick={() => { setWorkspaceApplicationId(null); openNewContact(); }} type="button"><Plus className="h-4 w-4" />{language === "he" ? "הוספת איש קשר" : "Add contact"}</button></section>
              <section><h4>📄 {language === "he" ? "קורות חיים" : "CV versions"}</h4>{resumes.length ? resumes.slice(0, 3).map((resume) => <div className="workspace-file" key={resume.id}><FileText className="h-4 w-4" /><span><strong>{resume.name}</strong><small>{new Date(resume.addedAt).toLocaleDateString()}</small></span></div>) : <p className="workspace-empty">{language === "he" ? "טרם נוספה גרסת קורות חיים." : "No CV version added yet."}</p>}<button className="text-button" onClick={() => { setWorkspaceApplicationId(null); navigateToSection("cv-lab"); }} type="button"><FileCheck2 className="h-4 w-4" />{language === "he" ? "פתיחת מעבדת קורות החיים" : "Open CV Lab"}</button></section>
              <section><h4>📝 {language === "he" ? "הערות" : "Notes"}</h4><p className="workspace-notes">{workspaceApplication.notes || (language === "he" ? "אין עדיין הערות להזדמנות הזו." : "No notes for this opportunity yet.")}</p></section>
            </div>
            <footer><button className="secondary-button" onClick={() => { setWorkspaceApplicationId(null); openEditApplication(workspaceApplication); }} type="button"><Pencil className="h-4 w-4" />{language === "he" ? "עריכת המועמדות" : "Edit application"}</button>{workspaceApplication.eventDateTime && <button className="secondary-button" onClick={() => downloadICS(`${workspaceApplication.eventType}: ${workspaceApplication.role} at ${workspaceApplication.company}`, workspaceApplication.eventDateTime, workspaceApplication.notes, workspaceApplication.location)} type="button"><CalendarPlus className="h-4 w-4" />{language === "he" ? "הוספה ליומן" : "Add to calendar"}</button>}{workspaceApplication.jobUrl && <a className="primary-button" href={workspaceApplication.jobUrl} rel="noreferrer" target="_blank">{language === "he" ? "פתיחת המשרה" : "Open job"}<ArrowUpRight className="h-4 w-4" /></a>}</footer>
          </div>
        </Modal>
      )}

      {showCommandBar && (
        <Modal title={language === "he" ? "מה תרצו לעשות?" : "What do you want to do?"} description={language === "he" ? "חפשו מועמדות או איש קשר, או עברו ישירות לפעולה." : "Find an application or contact, or jump directly to an action."} onClose={() => { setShowCommandBar(false); setCommandQuery(""); }}>
          <div className="command-palette">
            <label><Search className="h-5 w-5" /><input autoFocus onChange={(event) => setCommandQuery(event.target.value)} placeholder={language === "he" ? "חיפוש או פקודה…" : "Search or type a command…"} value={commandQuery} /><kbd>ESC</kbd></label>
            <div className="command-results">
              {[
                { label: language === "he" ? "הוספת מועמדות" : "Add application", icon: "💼", action: () => openNewApplication() },
                { label: language === "he" ? "לכידה חכמה מקישור" : "Smart capture from URL", icon: "✨", action: () => setShowSmartCapture(true) },
                { label: language === "he" ? "הוספת איש קשר" : "Add networking contact", icon: "🤝", action: () => openNewContact() },
                { label: language === "he" ? "חיפוש משרות" : "Search jobs", icon: "🔎", action: () => switchView("search") },
                { label: language === "he" ? "מרכז התובנות" : "Open insights", icon: "📊", action: () => switchView("more") },
              ].filter((item) => !commandQuery || item.label.toLowerCase().includes(commandQuery.toLowerCase())).map((item) => <button key={item.label} onClick={() => { setShowCommandBar(false); setCommandQuery(""); item.action(); }} type="button"><span>{item.icon}</span><strong>{item.label}</strong><ChevronRight className="h-4 w-4" /></button>)}
              {applications.filter((item) => commandQuery && `${item.company} ${item.role}`.toLowerCase().includes(commandQuery.toLowerCase())).slice(0, 5).map((application) => <button key={application.id} onClick={() => { setShowCommandBar(false); setWorkspaceApplicationId(application.id); }} type="button"><span>🏢</span><span><strong>{application.role}</strong><small>{application.company}</small></span><ChevronRight className="h-4 w-4" /></button>)}
              {contacts.filter((item) => commandQuery && `${item.name} ${item.company} ${item.role}`.toLowerCase().includes(commandQuery.toLowerCase())).slice(0, 4).map((contact) => <button key={contact.id} onClick={() => { setShowCommandBar(false); setCommandQuery(""); setContactQuery(contact.name); switchView("networking"); }} type="button"><span>👤</span><span><strong>{contact.name}</strong><small>{contact.role} · {contact.company}</small></span><ChevronRight className="h-4 w-4" /></button>)}
            </div>
          </div>
        </Modal>
      )}

      {showApplicationModal && (
        <Modal title={language === "he" ? (editingApplicationId ? "עריכת מועמדות" : "הוספת מועמדות") : (editingApplicationId ? "Edit application" : "Add application")} description={language === "he" ? "תעדו את ההזדמנות, מצב התהליך, לוחות הזמנים והצעד הבא." : "Capture the opportunity, its signal, timing, and your next move."} onClose={() => setShowApplicationModal(false)}>
          <form className="application-form-compact space-y-4" onSubmit={saveApplication}>
            <datalist id="application-source-options">{["LinkedIn", "Company careers page", "Referral", "Recruiter", "Indeed", "Google Jobs", "Networking", "Job board", "Other"].map((option) => <option key={option} value={option} />)}</datalist>
            <datalist id="application-action-options">{["Prepare for interview", "Send follow-up", "Complete assignment", "Research company", "Contact recruiter", "Contact hiring manager", "Ask for referral", "Wait for response", "Review offer"].map((option) => <option key={option} value={option} />)}</datalist>
            <datalist id="application-event-options">{["Recruiter screen", "Hiring manager interview", "Professional interview", "HR interview", "Panel interview", "Assignment", "Presentation", "Offer conversation", "Follow-up call"].map((option) => <option key={option} value={option} />)}</datalist>
            <datalist id="process-stage-options">{["Application submitted", "Initial screen", "Recruiter call", "Hiring manager interview", "Professional interview", "Assignment", "Panel interview", "References", "Offer", "Closed"].map((option) => <option key={option} value={option} />)}</datalist>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={language === "he" ? "חברה" : "Company"}><input autoFocus className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, company: e.target.value })} required value={applicationDraft.company} /></Field>
              <Field label={language === "he" ? "תפקיד" : "Role"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, role: e.target.value })} required value={applicationDraft.role} /></Field>
            </div>
            <div className="application-stage-signal">
              <Field label={language === "he" ? "שלב בתהליך" : "Pipeline stage"}><select className="form-control" onChange={(e) => setApplicationDraft((current) => ({ ...current, status: e.target.value as ApplicationStatus }))} value={applicationDraft.status}>{applicationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
              <TrafficLightPicker label={language === "he" ? "צבע הרמזור בשלב הזה" : "Traffic light for this stage"} language={language} onChange={(trafficLight) => setApplicationDraft((current) => ({ ...current, trafficLight }))} value={applicationDraft.trafficLight} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_190px]"><Field label={language === "he" ? "השלב הנוכחי או הצעד הבא" : "Current stage / next step"}><input className="form-control" list="application-action-options" onChange={(e) => setApplicationDraft({ ...applicationDraft, nextStep: e.target.value })} placeholder={language === "he" ? "בחרו הצעה או כתבו פעולה" : "Choose a suggestion or type an action"} required value={applicationDraft.nextStep} /></Field><Field label={language === "he" ? "תאריך יעד" : "Due date"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, nextStepDue: e.target.value })} type="date" value={applicationDraft.nextStepDue} /></Field></div>
            <button aria-expanded={showApplicationDetails} className="progressive-toggle" onClick={() => setShowApplicationDetails((current) => !current)} type="button"><span><Sparkles className="h-4 w-4" /><strong>{language === "he" ? (showApplicationDetails ? "הסתרת פרטים נוספים" : "הוספת פרטים נוספים") : (showApplicationDetails ? "Hide optional details" : "Add more details")}</strong><small>{language === "he" ? "שכר, מקור, פגישה, הערות וקישור למשרה" : "Salary, source, event, notes and job link"}</small></span><ChevronDown className={`h-5 w-5 transition ${showApplicationDetails ? "rotate-180" : ""}`} /></button>
            {showApplicationDetails && <div className="progressive-content space-y-5">
            <div className="company-logo-picker company-logo-picker-compact">
              <div aria-hidden="true" className={`company-logo-preview ${applicationDraft.logoUrl ? "company-logo-preview-image" : ""}`} style={applicationDraft.logoUrl ? { backgroundImage: `url("${applicationDraft.logoUrl}")` } : undefined}>{applicationDraft.logoUrl ? "" : applicationDraft.company.slice(0, 1).toUpperCase() || "🏢"}</div>
              <div className="min-w-0 flex-1">
                <Field label={language === "he" ? "אתר החברה או לוגו" : "Company website or logo"}><input className="form-control" onChange={(event) => { const companyWebsite = event.target.value; const existingIsAutomatic = !applicationDraft.logoUrl || applicationDraft.logoUrl.includes("google.com/s2/favicons"); setApplicationDraft((current) => ({ ...current, companyWebsite, logoUrl: existingIsAutomatic ? companyLogoFromWebsite(companyWebsite) : current.logoUrl })); }} onBlur={() => { if (applicationDraft.companyWebsite && !applicationDraft.logoUrl) setApplicationDraft((current) => ({ ...current, logoUrl: companyLogoFromWebsite(current.companyWebsite) })); }} placeholder="company.com" value={applicationDraft.companyWebsite} /></Field>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="logo-choice-button" disabled={!applicationDraft.companyWebsite} onClick={() => setApplicationDraft((current) => ({ ...current, logoUrl: companyLogoFromWebsite(current.companyWebsite) }))} type="button"><Sparkles className="h-3.5 w-3.5" />{language === "he" ? "לוגו מהאתר" : "Website logo"}</button>
                  <label className="logo-choice-button"><UploadCloud className="h-3.5 w-3.5" />{language === "he" ? "העלאת לוגו" : "Upload logo"}<input accept="image/*" className="sr-only" onChange={uploadCompanyLogo} type="file" /></label>
                  <button className="logo-choice-button" onClick={() => setApplicationDraft((current) => ({ ...current, logoUrl: "" }))} type="button"><X className="h-3.5 w-3.5" />{language === "he" ? "ללא לוגו" : "No logo"}</button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label={language === "he" ? "עיר / מיקום" : "City / location"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, location: e.target.value })} value={applicationDraft.location} /></Field><Field label={language === "he" ? "מדינה" : "Country"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, country: e.target.value })} value={applicationDraft.country} /></Field></div>
            <Field label={language === "he" ? "קישור למשרה" : "Job link"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, jobUrl: e.target.value })} placeholder="https://…" type="url" value={applicationDraft.jobUrl} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label={language === "he" ? "מקור" : "Source"}><input className="form-control" list="application-source-options" onChange={(e) => setApplicationDraft({ ...applicationDraft, source: e.target.value })} placeholder={language === "he" ? "בחרו או כתבו מקור" : "Choose or type a source"} value={applicationDraft.source} /></Field><Field label={language === "he" ? "תאריך הגשה" : "Applied date"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, appliedDate: e.target.value })} type="date" value={applicationDraft.appliedDate} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label={language === "he" ? "רמת התאמה" : "Fit level"}><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, priority: e.target.value as ApplicationDraft["priority"] })} value={applicationDraft.priority}>{priorities.map((priority) => <option key={priority} value={priority}>{language === "he" ? ({ Low: "נמוכה", Medium: "בינונית", High: "גבוהה" } as Record<string, string>)[priority] : priority}</option>)}</select></Field><Field label={language === "he" ? "מודל עבודה" : "Work model"}><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, workModel: e.target.value as ApplicationDraft["workModel"] })} value={applicationDraft.workModel}>{workModels.map((model) => <option key={model || "unset"} value={model}>{model || (language === "he" ? "לא צוין" : "Not specified")}</option>)}</select></Field></div>
            <Field label={language === "he" ? "איש או אשת קשר בחברה" : "Company contact"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, contactName: e.target.value })} placeholder={language === "he" ? "מגייסת, מנהל מגייס או רפרל" : "Recruiter, hiring manager, or referral"} value={applicationDraft.contactName} /></Field>
            <div className="grid gap-4 sm:grid-cols-[110px_1fr_1fr]"><Field label={language === "he" ? "מטבע" : "Currency"}><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, salaryCurrency: e.target.value as ApplicationDraft["salaryCurrency"] })} value={applicationDraft.salaryCurrency}>{["ILS", "USD", "EUR", "GBP", "Other"].map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label={language === "he" ? "ציפיות שכר" : "Salary expectation"}><input className="form-control" inputMode="decimal" onChange={(e) => setApplicationDraft({ ...applicationDraft, salary: e.target.value })} value={applicationDraft.salary} /></Field><Field label={language === "he" ? "טווח החברה" : "Company budget range"}><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, budgetRange: e.target.value })} value={applicationDraft.budgetRange} /></Field></div>
            <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4"><p className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-200"><CalendarPlus className="h-4 w-4" /> Interview or meeting</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Event type"><input className="form-control" list="application-event-options" onChange={(e) => setApplicationDraft({ ...applicationDraft, eventType: e.target.value })} placeholder={language === "he" ? "בחרו או כתבו סוג אירוע" : "Choose or type an event"} value={applicationDraft.eventType} /></Field><Field label="Date & time"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, eventDateTime: e.target.value })} type="datetime-local" value={applicationDraft.eventDateTime} /></Field></div><p className="mt-3 text-xs leading-5 text-slate-400">After saving, use Google Calendar or download a universal .ics file for Apple, Outlook, Samsung, and other calendars.</p></div>
            <Field label={language === "he" ? "הערות" : "Notes"}><textarea className="form-control min-h-20 resize-y" onChange={(e) => setApplicationDraft({ ...applicationDraft, notes: e.target.value })} value={applicationDraft.notes} /></Field>
            <div className="process-stage-editor">
              <div className="process-stage-heading"><div><strong>🚦 {language === "he" ? "שלבי התהליך" : "Process stages"}</strong><small>{language === "he" ? "תאריך ורמזור נפרד לכל שלב" : "A date and traffic light for every stage"}</small></div><button className="secondary-button" onClick={() => setApplicationDraft((current) => ({ ...current, processStages: [...current.processStages, { id: makeId("stage"), name: "", date: "", trafficLight: "none" }] }))} type="button"><Plus className="h-4 w-4" />{language === "he" ? "הוספת שלב" : "Add stage"}</button></div>
              {applicationDraft.processStages.length === 0 ? <p className="process-stage-empty">{language === "he" ? "אפשר להוסיף כאן שיחת סינון, ראיון, משימה או כל שלב אחר." : "Add a screen, interview, assignment, or any other stage when needed."}</p> : <div className="process-stage-list">{applicationDraft.processStages.map((stage) => <div className="process-stage-row" key={stage.id}><input aria-label={language === "he" ? "שם השלב" : "Stage name"} className="form-control" list="process-stage-options" onChange={(event) => setApplicationDraft((current) => ({ ...current, processStages: current.processStages.map((item) => item.id === stage.id ? { ...item, name: event.target.value } : item) }))} placeholder={language === "he" ? "בחרו או כתבו שם שלב" : "Choose or type a stage"} value={stage.name} /><input aria-label={language === "he" ? "תאריך השלב" : "Stage date"} className="form-control" onChange={(event) => setApplicationDraft((current) => ({ ...current, processStages: current.processStages.map((item) => item.id === stage.id ? { ...item, date: event.target.value } : item) }))} type="date" value={stage.date} /><select aria-label={language === "he" ? "רמזור השלב" : "Stage traffic light"} className={`form-control stage-signal-select stage-signal-${stage.trafficLight}`} onChange={(event) => setApplicationDraft((current) => ({ ...current, processStages: current.processStages.map((item) => item.id === stage.id ? { ...item, trafficLight: event.target.value as TrafficLight } : item) }))} value={stage.trafficLight}><option value="none">⚪ {language === "he" ? "ללא סטטוס" : "No signal"}</option><option value="green">🟢 {language === "he" ? "עבר / מתקדם" : "Passed / progressing"}</option><option value="yellow">🟡 {language === "he" ? "ממתין" : "Waiting"}</option><option value="red">🔴 {language === "he" ? "נדחה / נסגר" : "Rejected / closed"}</option></select><button aria-label={language === "he" ? "מחיקת שלב" : "Delete stage"} className="icon-button" onClick={() => setApplicationDraft((current) => ({ ...current, processStages: current.processStages.filter((item) => item.id !== stage.id) }))} type="button"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
            </div>
            </div>}
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowApplicationModal(false)} type="button">{language === "he" ? "ביטול" : "Cancel"}</button><button className="primary-button" type="submit">{language === "he" ? (editingApplicationId ? "שמירת השינויים" : "הוספת המועמדות") : (editingApplicationId ? "Save changes" : "Add application")}</button></div>
          </form>
        </Modal>
      )}

      {showContactModal && (
        <Modal title={language === "he" ? (editingContactId ? "עריכת איש קשר" : "הוספת איש קשר") : (editingContactId ? "Edit contact" : "Add contact")} description={language === "he" ? "בנו היסטוריית קשר שימושית ואל תפספסו את נקודת המגע הבאה." : "Build a useful relationship history and never miss the next touchpoint."} onClose={() => setShowContactModal(false)}>
          <form className="space-y-5" onSubmit={saveContact}>
            <datalist id="relationship-options">{["Former colleague", "Current colleague", "Recruiter", "Hiring manager", "Referral", "Alumni connection", "Professional community", "Friend", "New connection"].map((option) => <option key={option} value={option} />)}</datalist>
            <datalist id="network-action-options">{["Send a thank-you", "Ask for a short call", "Share an update", "Follow up on referral", "Send relevant article", "Congratulate on milestone", "Schedule coffee chat", "Check in"].map((option) => <option key={option} value={option} />)}</datalist>
            <datalist id="network-event-options">{["Coffee chat", "Networking call", "Introductory call", "Mentoring conversation", "Industry event", "Follow-up meeting", "Informational interview"].map((option) => <option key={option} value={option} />)}</datalist>
            <Field label="Name"><input autoFocus className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} required value={contactDraft.name} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Company"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, company: e.target.value })} value={contactDraft.company} /></Field><Field label="Role"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value })} required value={contactDraft.role} /></Field></div>
            <Field label="Relationship"><input className="form-control" list="relationship-options" onChange={(e) => setContactDraft({ ...contactDraft, relationship: e.target.value })} placeholder={language === "he" ? "בחרו או כתבו סוג קשר" : "Choose or type a relationship"} required value={contactDraft.relationship} /></Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_190px]"><Field label="Next action"><input className="form-control" list="network-action-options" onChange={(e) => setContactDraft({ ...contactDraft, nextAction: e.target.value })} placeholder={language === "he" ? "בחרו או כתבו פעולה" : "Choose or type an action"} required value={contactDraft.nextAction} /></Field><Field label="Due date"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, nextActionDue: e.target.value })} type="date" value={contactDraft.nextActionDue} /></Field></div>
            <button aria-expanded={showContactDetails} className="progressive-toggle" onClick={() => setShowContactDetails((current) => !current)} type="button"><span><Sparkles className="h-4 w-4" /><strong>{showContactDetails ? "Hide optional details" : "Add more details"}</strong><small>Signal, contact details, meeting and notes</small></span><ChevronDown className={`h-5 w-5 transition ${showContactDetails ? "rotate-180" : ""}`} /></button>
            {showContactDetails && <div className="progressive-content space-y-5">
            <TrafficLightPicker label={language === "he" ? "רמזור הקשר" : "Relationship signal"} language={language} onChange={(trafficLight) => setContactDraft({ ...contactDraft, trafficLight })} value={contactDraft.trafficLight} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Email"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} type="email" value={contactDraft.email} /></Field><Field label="Phone"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} type="tel" value={contactDraft.phone} /></Field></div>
            <Field label="LinkedIn profile"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/in/…" type="url" value={contactDraft.linkedInUrl} /></Field>
            <Field label="Last contact date"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, lastContactDate: e.target.value })} type="date" value={contactDraft.lastContactDate} /></Field>
            <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/5 p-4"><p className="mb-4 flex items-center gap-2 text-sm font-semibold text-fuchsia-200"><CalendarPlus className="h-4 w-4" /> Networking event</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Event type"><input className="form-control" list="network-event-options" onChange={(e) => setContactDraft({ ...contactDraft, eventType: e.target.value })} placeholder={language === "he" ? "בחרו או כתבו סוג פגישה" : "Choose or type an event"} value={contactDraft.eventType} /></Field><Field label="Date & time"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, eventDateTime: e.target.value })} type="datetime-local" value={contactDraft.eventDateTime} /></Field></div><p className="mt-3 text-xs leading-5 text-slate-400">Save first, then add the event to Google, Apple, Outlook, Samsung, or another device calendar.</p></div>
            <Field label="Notes (optional)"><textarea className="form-control min-h-24 resize-y" onChange={(e) => setContactDraft({ ...contactDraft, notes: e.target.value })} value={contactDraft.notes} /></Field>
            </div>}
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowContactModal(false)} type="button">{language === "he" ? "ביטול" : "Cancel"}</button><button className="primary-button" type="submit">{language === "he" ? (editingContactId ? "שמירת השינויים" : "הוספת איש הקשר") : (editingContactId ? "Save changes" : "Add contact")}</button></div>
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
            {recoveryNeed === "Help me close the loop" && <button className="secondary-button w-full border-pink-400/20 bg-pink-400/5" onClick={() => { setMessageProfile({ ...emptyMessageProfile, recipientType: "Recruiter", intent: "Thank them", tone: "Warm & professional", company: recoveryApplication.company, role: recoveryApplication.role }); setGeneratedMessage(""); setRecoveryApplication(null); navigateToSection("message-studio"); }} type="button">💌 Open a thank-you message in Message Studio</button>}
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

function TrafficLightPicker({ label, value, language, onChange }: { label: string; value: TrafficLight; language: Language; onChange: (value: TrafficLight) => void }) {
  return (
    <fieldset className="traffic-picker">
      <legend className="text-sm font-medium text-slate-200">{label}</legend>
      <div className="traffic-options">
        {trafficLights.map((trafficLight) => {
          const meta = trafficLightMeta[trafficLight];
          const translatedLabel = language === "he" ? ({ none: "ללא סטטוס", green: "מתקדם", yellow: "ממתין", red: "חסום או נסגר" } as Record<TrafficLight, string>)[trafficLight] : meta.label;
          return <button aria-label={`${label}: ${translatedLabel}`} aria-pressed={value === trafficLight} className={`traffic-option traffic-option-${trafficLight} ${value === trafficLight ? "traffic-option-selected" : ""}`} key={trafficLight} onClick={() => onChange(trafficLight)} type="button"><span className={`traffic-dot ${meta.dot}`} /><span>{translatedLabel}</span>{value === trafficLight && <CheckCircle2 aria-hidden="true" className="traffic-check h-4 w-4" />}</button>;
        })}
      </div>
      <p aria-live="polite" className="traffic-selection-note">{language === "he" ? "נבחר:" : "Selected:"} <strong>{language === "he" ? ({ none: "ללא סטטוס", green: "מתקדם", yellow: "ממתין", red: "חסום או נסגר" } as Record<TrafficLight, string>)[value] : trafficLightMeta[value].label}</strong></p>
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

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  const size = 240;
  const center = size / 2;
  const radius = 78;
  const max = Math.max(1, ...data.map((item) => item.value));
  const point = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / data.length;
    return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
  };
  const polygon = data.map((item, index) => point(index, item.value / max)).join(" ");
  return <div className="flex min-h-48 flex-col items-center gap-3">
    <svg aria-label="Process-stage health radar chart" className="w-full max-w-xs overflow-visible" role="img" viewBox={`0 0 ${size} ${size}`}>
      {[0.33, 0.66, 1].map((scale) => <polygon fill="none" key={scale} points={data.map((_, index) => point(index, scale)).join(" ")} stroke="rgba(148,163,184,.22)" strokeWidth="1" />)}
      {data.map((_, index) => <line key={index} stroke="rgba(148,163,184,.18)" x1={center} x2={point(index, 1).split(",")[0]} y1={center} y2={point(index, 1).split(",")[1]} />)}
      <polygon fill="rgba(34,211,238,.22)" points={polygon} stroke="#22d3ee" strokeLinejoin="round" strokeWidth="2.5" />
      {data.map((item, index) => {
        const [x, y] = point(index, item.value / max).split(",");
        const [labelX, labelY] = point(index, 1.23).split(",");
        return <g key={item.label}><circle cx={x} cy={y} fill="#5eead4" r="4" /><text fill="currentColor" fontSize="9" textAnchor="middle" x={labelX} y={labelY}>{item.label}</text></g>;
      })}
    </svg>
  </div>;
}

function OpportunityMatrix({ data, language }: {
  data: {
    id: string;
    company: string;
    role: string;
    fit: number;
    progression: number;
    priority: (typeof priorities)[number];
    trafficLight: TrafficLight;
    status: ApplicationStatus;
    overdue: boolean;
  }[];
  language: Language;
}) {
  const colors: Record<TrafficLight, string> = {
    none: "#94a3b8",
    green: "#34d399",
    yellow: "#fbbf24",
    red: "#fb7185",
  };
  const fitLabels = language === "he" ? ["נמוכה", "בינונית", "גבוהה"] : ["Low", "Medium", "High"];
  const progressLabels = language === "he" ? ["נרשמה", "מעקב", "ראיון", "הצעה"] : ["Tracked", "Follow-up", "Interview", "Offer"];
  const xFor = (fit: number) => 72 + (fit - 1) * 108;
  const yFor = (progression: number) => 198 - (progression - 1) * 48;

  if (!data.length) {
    return <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center text-sm text-slate-500">{language === "he" ? "הוסיפו מועמדויות ורמת התאמה כדי לבנות את המטריצה." : "Add applications and fit levels to build your matrix."}</div>;
  }

  return <div className="min-h-48">
    <svg aria-label={language === "he" ? "מטריצת איכות הזדמנויות" : "Opportunity quality matrix"} className="w-full overflow-visible" role="img" viewBox="0 0 360 255">
      <defs>
        <linearGradient id="matrixOpportunityZone" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.20" />
        </linearGradient>
      </defs>
      <rect fill="url(#matrixOpportunityZone)" height="174" rx="14" width="292" x="46" y="24" />
      {[1, 2, 3].map((fit) => <line key={`fit-${fit}`} stroke="rgba(148,163,184,.16)" x1={xFor(fit)} x2={xFor(fit)} y1="24" y2="198" />)}
      {[1, 2, 3, 4].map((progression) => <line key={`progress-${progression}`} stroke="rgba(148,163,184,.16)" x1="46" x2="338" y1={yFor(progression)} y2={yFor(progression)} />)}
      <text fill="currentColor" fontSize="9" textAnchor="middle" x="192" y="245">{language === "he" ? "רמת התאמה למשרה" : "Role fit"}</text>
      {fitLabels.map((label, index) => <text fill="currentColor" fontSize="8" key={label} opacity=".72" textAnchor="middle" x={xFor(index + 1)} y="218">{label}</text>)}
      <text fill="currentColor" fontSize="9" textAnchor="middle" transform="rotate(-90 12 111)" x="12" y="111">{language === "he" ? "התקדמות בתהליך" : "Pipeline progress"}</text>
      {progressLabels.map((label, index) => <text fill="currentColor" fontSize="7.5" key={label} opacity=".68" textAnchor="end" x="40" y={yFor(index + 1) + 3}>{label}</text>)}
      {data.map((item, index) => {
        const sameCellIndex = data.slice(0, index).filter((other) => other.fit === item.fit && other.progression === item.progression).length;
        const jitterX = sameCellIndex % 2 === 0 ? sameCellIndex * 7 : -sameCellIndex * 7;
        const jitterY = sameCellIndex * -5;
        const x = xFor(item.fit) + jitterX;
        const y = yFor(item.progression) + jitterY;
        const radius = item.priority === "High" ? 13 : item.priority === "Medium" ? 10.5 : 8.5;
        const accessibleLabel = `${item.company}, ${item.role}, ${item.status}, ${item.priority} fit, ${trafficLightMeta[item.trafficLight].label}`;
        return <g aria-label={accessibleLabel} key={item.id} role="group">
          <title>{accessibleLabel}</title>
          {item.overdue && <circle cx={x} cy={y} fill="none" r={radius + 4} stroke="#fb7185" strokeDasharray="3 3" strokeWidth="1.5" />}
          <circle className="transition-all duration-300 hover:opacity-80" cx={x} cy={y} fill={colors[item.trafficLight]} fillOpacity=".92" r={radius} stroke="rgba(255,255,255,.82)" strokeWidth="1.5" />
          <text fill="#07131f" fontSize={radius > 10 ? "7" : "6"} fontWeight="800" textAnchor="middle" x={x} y={y + 2.4}>{item.company.slice(0, 2).toUpperCase()}</text>
        </g>;
      })}
    </svg>
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
      {(["green", "yellow", "red", "none"] as TrafficLight[]).map((signal) => <span className="flex items-center gap-1.5" key={signal}><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[signal] }} />{language === "he" ? ({ green: "מתקדם", yellow: "ממתין", red: "חסום/נסגר", none: "ללא סימון" } as Record<TrafficLight, string>)[signal] : trafficLightMeta[signal].label}</span>)}
      <span>{language === "he" ? "עיגול גדול = התאמה גבוהה" : "Larger circle = higher fit"}</span>
      <span>{language === "he" ? "מסגרת מקווקוות = פעולה באיחור" : "Dashed ring = overdue action"}</span>
    </div>
  </div>;
}

function FunnelChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const colors = ["linear-gradient(90deg,#22d3ee,#38bdf8)", "linear-gradient(90deg,#8b5cf6,#c084fc)", "linear-gradient(90deg,#10b981,#5eead4)"];
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3">
    {data.map((item, index) => {
      const relative = item.value / max;
      const width = item.value ? Math.max(42, 100 - index * 23, relative * 100) : Math.max(34, 100 - index * 23);
      return <div className="flex w-full flex-col items-center" key={item.label}>
        <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl px-4 text-white shadow-lg transition-all duration-500" style={{ background: colors[index], opacity: item.value ? 1 : 0.32, width: `${width}%` }}>
          <span className="truncate text-sm font-medium">{item.label}</span><strong className="text-lg">{item.value}</strong>
        </div>
        {index < data.length - 1 && <span aria-hidden="true" className="my-0.5 text-slate-500">↓</span>}
      </div>;
    })}
  </div>;
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = total ? data.map((item) => { const start = cursor; cursor += item.value / total * 100; return `${item.color} ${start}% ${cursor}%`; }).join(", ") : "#1e293b 0 100%";
  return <div className="flex min-h-48 flex-col items-center justify-center gap-5 sm:flex-row"><div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}><div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-slate-950"><strong className="text-3xl text-white">{total}</strong><span className="text-xs text-slate-500">colored signals</span></div></div><div className="w-full space-y-3">{data.map((item) => <div className="flex items-center justify-between gap-4" key={item.label}><span className="flex items-center gap-2 text-sm text-slate-400"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong className="text-sm text-slate-200">{item.value}</strong></div>)}</div></div>;
}
