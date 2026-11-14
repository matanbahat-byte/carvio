export type MomentumApplication = { id: string; status: string; appliedDate?: string };
export type MomentumContact = { id: string; lastContactDate?: string };
export type MomentumEvent = { id: string; name: string; targetId: string; occurredAt: string };

const DAY = 24 * 60 * 60 * 1000;

function isWithinWindow(value: string | undefined, now: number, windowMs = 7 * DAY) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - windowMs;
}

export function meaningfulMomentum(
  applications: MomentumApplication[],
  contacts: MomentumContact[],
  events: MomentumEvent[],
  now = Date.now(),
) {
  const entities = new Set<string>();

  applications.forEach((application) => {
    if (application.status !== "Considering" && isWithinWindow(application.appliedDate, now)) {
      entities.add(`application-${application.id}`);
    }
  });
  contacts.forEach((contact) => {
    if (isWithinWindow(contact.lastContactDate, now)) entities.add(`contact-${contact.id}`);
  });
  events.forEach((event) => {
    if (!isWithinWindow(event.occurredAt, now)) return;
    if (event.name === "application_action_completed") entities.add(`application-${event.targetId}`);
    if (event.name === "contact_created") entities.add(`contact-${event.targetId}`);
  });

  return { total: entities.size, entityIds: [...entities] };
}

export function greetingForHour(language: "he" | "en", hour: number) {
  if (hour >= 5 && hour < 12) return language === "he" ? "בוקר טוב" : "Good morning";
  if (hour >= 12 && hour < 17) return language === "he" ? "צהריים טובים" : "Good afternoon";
  if (hour >= 17 && hour < 22) return language === "he" ? "ערב טוב" : "Good evening";
  return language === "he" ? "לילה טוב" : "Good night";
}

export function calendarDayOffset(value: string, now: number) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const current = new Date(now);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const targetDay = dateOnly
    ? Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const currentDay = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
  return Math.round((targetDay - currentDay) / DAY);
}
