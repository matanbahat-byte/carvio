/** Pure aggregate reporting. Call only with a complete, authorized server-side export. */
export type TrafficContext = {
  environment?: "production" | "preview" | "development" | "test";
  actorKind?: "user" | "internal" | "automated";
};
export type IntelligenceEvent = TrafficContext & {
  id: string;
  userId: string | null;
  name: string;
  occurredAt: string;
  properties?: Record<string, unknown>;
};
export type IntelligenceRegistration = TrafficContext & { userId: string; registeredAt: string };

// A submission or external source click alone does not prove useful results.
const meaningfulNames = new Set([
  "job_opened", "job_saved", "opportunity_saved", "application_created",
  "application_updated", "application_status_updated", "application_action_completed",
  "marked_applied", "interview_recorded", "recommendation_completed", "follow_up_completed",
]);

export function isMeaningfulJobSearchEvent(event: Pick<IntelligenceEvent, "name" | "properties">) {
  return meaningfulNames.has(event.name)
    || (event.name === "search_completed" && event.properties?.usableResult === true);
}

const dayMs = 86_400_000;
const isRealProductionUser = (value: TrafficContext) => value.environment === "production" && value.actorKind === "user";

/** Dn means a meaningful action in [registration+n days, registration+(n+1) days). */
export function productIntelligence(input: {
  events: readonly IntelligenceEvent[] | null;
  registrations: readonly IntelligenceRegistration[] | null;
  asOf: string;
  excludedUserIds?: readonly string[];
}) {
  const asOf = Date.parse(input.asOf);
  if (!Number.isFinite(asOf)) throw new RangeError("asOf must be a valid timestamp");
  const excluded = new Set(input.excludedUserIds || []);
  const seen = new Set<string>();
  let rejectedEvents = 0;
  const events: { userId: string; at: number }[] = [];
  for (const event of input.events || []) {
    const at = Date.parse(event.occurredAt);
    const key = JSON.stringify([event.userId, event.id]);
    if (!event.id || !event.userId || excluded.has(event.userId) || !isRealProductionUser(event)
      || !Number.isFinite(at) || at >= asOf || seen.has(key)) {
      rejectedEvents++;
      continue;
    }
    seen.add(key);
    if (isMeaningfulJobSearchEvent(event)) events.push({ userId: event.userId, at });
  }
  const registrations = new Map<string, number>();
  let rejectedRegistrations = 0;
  for (const registration of input.registrations || []) {
    const at = Date.parse(registration.registeredAt);
    if (!registration.userId || excluded.has(registration.userId) || !isRealProductionUser(registration)
      || !Number.isFinite(at) || at >= asOf || registrations.has(registration.userId)) {
      rejectedRegistrations++;
      continue;
    }
    registrations.set(registration.userId, at);
  }
  const retention = ([1, 3, 7] as const).map((day) => {
    if (input.events === null || input.registrations === null) return { day, eligible: null, retained: null, rate: null };
    const eligible = [...registrations].filter(([, at]) => at + (day + 1) * dayMs <= asOf);
    const retained = eligible.filter(([userId, at]) => events.some((event) => event.userId === userId
      && event.at >= at + day * dayMs && event.at < at + (day + 1) * dayMs)).length;
    return { day, eligible: eligible.length, retained, rate: eligible.length ? retained / eligible.length : null };
  });
  return {
    asOf: new Date(asOf).toISOString(),
    weeklyMeaningfullyActiveJobSeekers: input.events === null ? null
      : new Set(events.filter((event) => event.at >= asOf - 7 * dayMs).map((event) => event.userId)).size,
    retention,
    dataQuality: {
      eventsAvailable: input.events !== null,
      registrationsAvailable: input.registrations !== null,
      rejectedEvents,
      rejectedRegistrations,
    },
  };
}
