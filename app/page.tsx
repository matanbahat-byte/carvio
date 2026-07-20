"use client";

import { FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Compass,
  MessageCircleMore,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Users2,
  X,
} from "lucide-react";

const APPLICATIONS_KEY = "carvio.applications.v1";
const CONTACTS_KEY = "carvio.contacts.v1";
const FEEDBACK_KEY = "carvio.feedback.v1";

const applicationStatuses = [
  "Applied",
  "Interview",
  "Offer",
  "Follow-up due",
  "Rejected",
  "Withdrawn",
] as const;

type ApplicationStatus = (typeof applicationStatuses)[number];

type Application = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  nextStep: string;
  notes: string;
};

type Contact = {
  id: string;
  name: string;
  companyRole: string;
  relationship: string;
  nextAction: string;
  notes: string;
};

type Feedback = {
  id: string;
  workedWell: string;
  confusing: string;
  missing: string;
  rating: number;
  submittedAt: string;
};

type ApplicationDraft = Omit<Application, "id">;
type ContactDraft = Omit<Contact, "id">;

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
  nextStep: "",
  notes: "",
};

const emptyContact: ContactDraft = {
  name: "",
  companyRole: "",
  relationship: "",
  nextAction: "",
  notes: "",
};

const demoApplications: Application[] = [
  {
    id: "demo-app-1",
    company: "Northstar Labs",
    role: "Senior Product Designer",
    status: "Interview",
    nextStep: "Prepare two portfolio stories",
    notes: "Interview with the product design lead.",
  },
  {
    id: "demo-app-2",
    company: "Lumen Studio",
    role: "Product Designer",
    status: "Applied",
    nextStep: "Check for a response next week",
    notes: "Applied through the company careers page.",
  },
  {
    id: "demo-app-3",
    company: "Orbit Health",
    role: "Senior UX Researcher",
    status: "Follow-up due",
    nextStep: "Send portfolio follow-up",
    notes: "Recruiter requested two relevant case studies.",
  },
];

const demoContacts: Contact[] = [
  {
    id: "demo-contact-1",
    name: "Mina Chen",
    companyRole: "VP Design at Northstar",
    relationship: "Former colleague",
    nextAction: "Ask about the design team",
    notes: "Available for a short chat this week.",
  },
  {
    id: "demo-contact-2",
    name: "Ari Malik",
    companyRole: "Principal Engineer at Lumen",
    relationship: "Second-degree connection",
    nextAction: "Thank Ari for the introduction",
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

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusableSelector = "button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
    window.setTimeout(() => {
      const preferred = modalRef.current?.querySelector<HTMLElement>("[autofocus]");
      const first = modalRef.current?.querySelector<HTMLElement>(focusableSelector);
      (preferred || first)?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
  }, [onClose]);

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
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6"
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
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setApplications(readStored(APPLICATIONS_KEY, demoApplications));
      setContacts(readStored(CONTACTS_KEY, demoContacts));
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
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey || target.matches("input, textarea, select") || showApplicationModal || showContactModal || showFeedbackModal) return;
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
      { label: "Follow-ups due", value: applications.filter((item) => item.status === "Follow-up due").length, icon: CircleAlert },
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
    const followUp = applications.find((item) => item.status === "Follow-up due");
    if (followUp) return { eyebrow: "Follow-up due", title: followUp.nextStep || `Follow up with ${followUp.company}`, detail: `${followUp.role} at ${followUp.company}`, target: "applications" };
    const missingStep = applications.find((item) => !["Rejected", "Withdrawn"].includes(item.status) && !item.nextStep.trim());
    if (missingStep) return { eyebrow: "Needs a next step", title: `Plan the next move for ${missingStep.company}`, detail: missingStep.role, target: "applications" };
    const interview = applications.find((item) => item.status === "Interview");
    if (interview) return { eyebrow: "Interview preparation", title: interview.nextStep || `Prepare for ${interview.company}`, detail: `${interview.role} at ${interview.company}`, target: "applications" };
    const contact = contacts.find((item) => item.nextAction.trim());
    if (contact) return { eyebrow: "Networking next step", title: contact.nextAction, detail: `${contact.name} · ${contact.companyRole}`, target: "networking" };
    return { eyebrow: "Start your day", title: "Add your next opportunity", detail: "A clear pipeline starts with one application.", target: "applications" };
  }, [applications, contacts]);

  function openNewApplication() {
    setEditingApplicationId(null);
    setApplicationDraft(emptyApplication);
    setShowApplicationModal(true);
  }

  function openEditApplication(application: Application) {
    setEditingApplicationId(application.id);
    setApplicationDraft({ company: application.company, role: application.role, status: application.status, nextStep: application.nextStep, notes: application.notes });
    setShowApplicationModal(true);
  }

  function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingApplicationId) {
      setApplications((items) => items.map((item) => item.id === editingApplicationId ? { ...applicationDraft, id: item.id } : item));
      setNotice("Application updated.");
    } else {
      setApplications((items) => [{ ...applicationDraft, id: makeId("app") }, ...items]);
      setNotice("Application added.");
    }
    setShowApplicationModal(false);
  }

  function deleteApplication(application: Application) {
    if (window.confirm(`Delete the ${application.role} application at ${application.company}?`)) {
      setApplications((items) => items.filter((item) => item.id !== application.id));
      setNotice("Application deleted.");
    }
  }

  function updateApplicationStatus(application: Application, status: ApplicationStatus) {
    setApplications((items) => items.map((item) => item.id === application.id ? { ...item, status } : item));
    setNotice(`${application.company} moved to ${status}.`);
  }

  function openNewContact() {
    setEditingContactId(null);
    setContactDraft(emptyContact);
    setShowContactModal(true);
  }

  function openEditContact(contact: Contact) {
    setEditingContactId(contact.id);
    setContactDraft({ name: contact.name, companyRole: contact.companyRole, relationship: contact.relationship, nextAction: contact.nextAction, notes: contact.notes });
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

  function resetDemoData() {
    if (window.confirm("Reset applications and contacts to the original demo data? Your current entries will be replaced.")) {
      setApplications(demoApplications);
      setContacts(demoContacts);
      setNotice("Demo data restored.");
    }
  }

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry: Feedback = {
      id: makeId("feedback"),
      workedWell: String(form.get("workedWell") || ""),
      confusing: String(form.get("confusing") || ""),
      missing: String(form.get("missing") || ""),
      rating: Number(form.get("rating")),
      submittedAt: new Date().toISOString(),
    };
    const previous = readStored<Feedback[]>(FEEDBACK_KEY, []);
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify([...previous, entry]));
    const emailBody = [
      "Carvio pilot feedback",
      "",
      `Rating: ${entry.rating}/5`,
      "",
      "What worked well?",
      entry.workedWell || "No response provided.",
      "",
      "What was confusing?",
      entry.confusing || "No response provided.",
      "",
      "What is missing?",
      entry.missing || "No response provided.",
    ].join("\n");
    window.location.href = `mailto:matanbahat@gmail.com?subject=${encodeURIComponent("Carvio pilot feedback")}&body=${encodeURIComponent(emailBody)}`;
    setShowFeedbackModal(false);
    setNotice("Feedback saved. Please send the draft in your email app.");
  }

  if (!hydrated) {
    return <main className="min-h-screen bg-slate-950" aria-label="Loading Carvio" />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_50%,_#0f172a_100%)] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <Compass className="h-4 w-4" /> Career tracking, reimagined
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Welcome back to Carvio</p>
                <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">Let’s move your search forward.</h1>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-300">One clear next step at a time—across every application and conversation.</p>
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
                <button className="secondary-button" onClick={() => setShowFeedbackModal(true)} type="button"><MessageCircleMore className="h-4 w-4" /> Send feedback</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Keyboard shortcuts: <kbd className="shortcut-key">A</kbd> application · <kbd className="shortcut-key">C</kbd> contact</p>
            </div>
          </div>
        </header>

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
                <article className="content-card" key={application.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-100">{application.role}</h3>
                      <p className="mt-1 text-sm text-slate-400">{application.company}</p>
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
                  <div className="mt-4 rounded-xl bg-white/[0.04] p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Current stage / next step</p>
                    <p className="mt-1 text-sm text-slate-300">{application.nextStep || "No next step added"}</p>
                  </div>
                  {application.notes && <p className="mt-3 text-sm text-slate-400">{application.notes}</p>}
                  <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                    <button className="text-button" onClick={() => openEditApplication(application)} type="button"><Pencil className="h-4 w-4" /> Edit</button>
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
                <article className="content-card" key={contact.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold text-slate-100">{contact.name}</h3><p className="mt-1 text-sm text-slate-400">{contact.companyRole}</p></div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fuchsia-300" />
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">{contact.relationship}</p>
                  <div className="mt-3 rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-500">Next action</p><p className="mt-1 text-sm text-slate-300">{contact.nextAction}</p></div>
                  {contact.notes && <p className="mt-3 text-sm text-slate-400">{contact.notes}</p>}
                  <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                    <button className="text-button" onClick={() => openEditContact(contact)} type="button"><Pencil className="h-4 w-4" /> Edit</button>
                    <button className="text-button text-rose-300 hover:text-rose-200" onClick={() => deleteContact(contact)} type="button"><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {notice && <div aria-atomic="true" aria-live="polite" className="toast" role="status"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /><span>{notice}</span><button aria-label="Dismiss notification" className="ml-1 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={() => setNotice("")} type="button"><X className="h-4 w-4" /></button></div>}

      {showApplicationModal && (
        <Modal title={editingApplicationId ? "Edit application" : "Add application"} description="Keep the opportunity and its next move in one place." onClose={() => setShowApplicationModal(false)}>
          <form className="space-y-4" onSubmit={saveApplication}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company"><input autoFocus className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, company: e.target.value })} required value={applicationDraft.company} /></Field>
              <Field label="Role"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, role: e.target.value })} required value={applicationDraft.role} /></Field>
            </div>
            <Field label="Status"><select className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, status: e.target.value as ApplicationStatus })} value={applicationDraft.status}>{applicationStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
            <Field label="Current stage / next step"><input className="form-control" onChange={(e) => setApplicationDraft({ ...applicationDraft, nextStep: e.target.value })} placeholder="e.g. Prepare for recruiter screen" required value={applicationDraft.nextStep} /></Field>
            <Field label="Notes (optional)"><textarea className="form-control min-h-24 resize-y" onChange={(e) => setApplicationDraft({ ...applicationDraft, notes: e.target.value })} value={applicationDraft.notes} /></Field>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowApplicationModal(false)} type="button">Cancel</button><button className="primary-button" type="submit">{editingApplicationId ? "Save changes" : "Add application"}</button></div>
          </form>
        </Modal>
      )}

      {showContactModal && (
        <Modal title={editingContactId ? "Edit contact" : "Add contact"} description="Capture the relationship and a useful next action." onClose={() => setShowContactModal(false)}>
          <form className="space-y-4" onSubmit={saveContact}>
            <Field label="Name"><input autoFocus className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} required value={contactDraft.name} /></Field>
            <Field label="Company / role"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, companyRole: e.target.value })} required value={contactDraft.companyRole} /></Field>
            <Field label="Relationship"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, relationship: e.target.value })} placeholder="e.g. Former colleague" required value={contactDraft.relationship} /></Field>
            <Field label="Next action"><input className="form-control" onChange={(e) => setContactDraft({ ...contactDraft, nextAction: e.target.value })} required value={contactDraft.nextAction} /></Field>
            <Field label="Notes (optional)"><textarea className="form-control min-h-24 resize-y" onChange={(e) => setContactDraft({ ...contactDraft, notes: e.target.value })} value={contactDraft.notes} /></Field>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowContactModal(false)} type="button">Cancel</button><button className="primary-button" type="submit">{editingContactId ? "Save changes" : "Add contact"}</button></div>
          </form>
        </Modal>
      )}

      {showFeedbackModal && (
        <Modal title="Send feedback" description="We’ll save a backup here, then open your email app with a ready-to-send draft." onClose={() => setShowFeedbackModal(false)}>
          <form className="space-y-4" onSubmit={submitFeedback}>
            <Field label="What worked well?"><textarea className="form-control min-h-20 resize-y" name="workedWell" required /></Field>
            <Field label="What was confusing?"><textarea className="form-control min-h-20 resize-y" name="confusing" /></Field>
            <Field label="What is missing?"><textarea className="form-control min-h-20 resize-y" name="missing" /></Field>
            <Field label="Rating from 1 to 5"><select className="form-control" defaultValue="5" name="rating" required>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} — {rating === 1 ? "Needs work" : rating === 5 ? "Excellent" : ""}</option>)}</select></Field>
            <p className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm leading-6 text-slate-300">Your email app will open after you continue. Review the draft and press <strong className="font-semibold text-slate-100">Send</strong> to deliver your feedback.</p>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowFeedbackModal(false)} type="button">Cancel</button><button className="primary-button" type="submit"><Send className="h-4 w-4" />Open email app</button></div>
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
