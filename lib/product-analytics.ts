export const PRODUCT_EVENT_CHANNEL = "carvio:product-event";

export type AnalyticsProperty = string | number | boolean;
export type AnalyticsProperties = Record<string, AnalyticsProperty>;

const allowedProperties = new Set([
  "activeSeconds",
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

export function sanitizeAnalyticsProperties(properties: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) => allowedProperties.has(key) && ["string", "number", "boolean"].includes(typeof value),
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

export function emitProductEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRODUCT_EVENT_CHANNEL, {
    detail: { eventName, properties: sanitizeAnalyticsProperties(properties) },
  }));
}
