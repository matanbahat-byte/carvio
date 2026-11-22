export const PRODUCT_EVENT_CHANNEL = "carvio:product-event";

export type AnalyticsProperty = string | number | boolean;
export type AnalyticsProperties = Record<string, AnalyticsProperty>;

const allowedProperties = new Set([
  "activeSeconds",
  "channel",
  "count",
  "days",
  "durationBucket",
  "intent",
  "method",
  "readiness",
  "screen",
  "sessionId",
  "sourceType",
  "status",
]);

export function acquisitionChannel(search = "", referrer = "") {
  const params = new URLSearchParams(search);
  const tagged = `${params.get("utm_source") || ""} ${params.get("utm_medium") || ""}`.toLowerCase();
  const source = `${tagged} ${referrer}`.toLowerCase();
  if (/linkedin/.test(source)) return "linkedin";
  if (/facebook|fb\b|instagram|meta/.test(source)) return "meta";
  if (/whatsapp|wa\.me/.test(source)) return "whatsapp";
  // Campaign partner links use a coarse category, never a partner name or full URL.
  if (/\bcommunity\b/.test(tagged)) return "community";
  if (/google|bing|duckduckgo|search/.test(source)) return "search";
  return referrer || tagged.trim() ? "referral" : "direct";
}

export function sanitizeAnalyticsProperties(properties: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) => allowedProperties.has(key)
        && (typeof value === "boolean"
          || (typeof value === "number" && Number.isFinite(value))
          || (typeof value === "string" && value.length <= 128)),
    ),
  ) as AnalyticsProperties;
}

export function activeDurationBucket(activeSeconds: number) {
  if (activeSeconds < 30) return "under_30s";
  if (activeSeconds < 120) return "30s_to_2m";
  if (activeSeconds < 300) return "2m_to_5m";
  if (activeSeconds < 900) return "5m_to_15m";
  return "15m_plus";
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isReturningVisit(lastVisit: string | null, today = localDateKey()) {
  return Boolean(lastVisit && lastVisit !== today);
}

export function emitProductEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRODUCT_EVENT_CHANNEL, {
    detail: { eventName, properties: sanitizeAnalyticsProperties(properties) },
  }));
}
