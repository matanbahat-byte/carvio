import { sanitizeAnalyticsProperties, type AnalyticsProperties } from "./product-analytics.ts";

export type AnalyticsRow = {
  id: string;
  user_id: string;
  event_name: string;
  properties: AnalyticsProperties;
  created_at: string;
};

/** Even accessing window.localStorage may throw in restricted browser contexts. */
export function safeAnalyticsStorage(getStorage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  return {
    get(key: string) { try { return getStorage().getItem(key); } catch { return null; } },
    set(key: string, value: string) { try { getStorage().setItem(key, value); } catch { /* Telemetry is optional. */ } },
    remove(key: string) { try { getStorage().removeItem(key); } catch { /* Telemetry is optional. */ } },
  };
}

/** Auth-only delivery: a queued row can never be reassigned to another account. */
export function createAnalyticsDelivery(options: {
  id: () => string;
  send: (rows: AnalyticsRow[]) => PromiseLike<{ error: unknown }>;
  acknowledged?: (rows: AnalyticsRow[]) => void;
}) {
  let owner: string | null = null;
  let generation = 0;
  let queue: AnalyticsRow[] = [];
  let flushing = false;
  return {
    setOwner(userId: string | null) {
      if (owner === userId) return false;
      owner = userId;
      generation++;
      queue = [];
      return true;
    },
    enqueue(eventName: string, properties: Record<string, unknown> = {}, eventId?: string) {
      // Do not infer which account owns interactions captured before auth resolves.
      if (!owner || !eventName.trim()) return;
      try {
        queue = [...queue.slice(-99), {
          id: eventId || options.id(), user_id: owner, event_name: eventName.slice(0, 80),
          properties: sanitizeAnalyticsProperties(properties), created_at: new Date().toISOString(),
        }];
      } catch { /* Broken optional identifiers/properties must not break an interaction. */ }
    },
    async flush() {
      if (flushing || !owner || !queue.length) return;
      flushing = true;
      try {
        while (owner && queue.length) {
          const batchGeneration = generation;
          const pending = queue.splice(0, 25);
          let failed = true;
          try { failed = Boolean((await options.send(pending)).error); } catch { /* Retry only for the same account. */ }
          if (batchGeneration !== generation) continue;
          if (failed) {
            queue = [...pending, ...queue].slice(-100);
            break;
          }
          try { options.acknowledged?.(pending); } catch { /* An optional acknowledgement must never reject delivery. */ }
        }
      } finally { flushing = false; }
    },
  };
}
