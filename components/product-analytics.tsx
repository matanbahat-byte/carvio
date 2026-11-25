"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAnalyticsDelivery, safeAnalyticsStorage } from "@/lib/analytics-delivery";
import { createActiveTimeClock } from "@/lib/analytics-active-time";
import {
  PRODUCT_EVENT_CHANNEL,
  acquisitionChannel,
  activeDurationBucket,
  localDateKey,
} from "@/lib/product-analytics";

const SESSION_KEY = "carvio.analytics-session.v2";
const LAST_ACTIVE_DAY_KEY = "carvio.analytics-last-active-day.v1";
const ACQUISITION_RECORDED_KEY = "carvio.analytics-acquisition-recorded.v1";
const PENDING_CHANNEL_KEY = "carvio.analytics-pending-channel.v1";

function makeSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProductAnalytics() {
  const supabaseRef = useRef<ReturnType<typeof createClient>>(null);

  useEffect(() => {
    try { supabaseRef.current = createClient(); } catch { return; }
    const supabase = supabaseRef.current;
    if (!supabase || new URLSearchParams(window.location.search).get("demo") === "1") return;

    let clock = createActiveTimeClock(performance.now(), document.visibilityState === "visible" && document.hasFocus());

    let disposed = false;
    const sessionStorage = safeAnalyticsStorage(() => window.sessionStorage);
    const localStorage = safeAnalyticsStorage(() => window.localStorage);
    let sessionId = makeSessionId();
    let sessionOwner: string | null = null;
    const acquisitionRecorded = new Set<string>();
    let acquisitionQueued = false;
    const delivery = createAnalyticsDelivery({
      id: () => crypto.randomUUID(),
      // Stable row IDs make retries idempotent even if the original acknowledgement was lost.
      send: (rows) => supabase.from("product_events").upsert(rows, { onConflict: "id", ignoreDuplicates: true }),
      acknowledged: (rows) => {
        if (!rows.some((event) => event.event_name === "acquisition_attributed")) return;
        acquisitionRecorded.add(rows[0].user_id);
        localStorage.set(`${ACQUISITION_RECORDED_KEY}:${rows[0].user_id}`, "1");
        sessionStorage.remove(PENDING_CHANNEL_KEY);
        acquisitionQueued = false;
      },
    });
    const enqueue = (eventName: string, properties: Record<string, unknown> = {}) => {
      if (!disposed) delivery.enqueue(eventName, { ...properties, sessionId });
    };
    const flush = () => delivery.flush();

    const recordHeartbeat = () => {
      const activeSeconds = clock.takeHeartbeat(performance.now());
      if (activeSeconds === null) { void flush(); return; }
      enqueue("session_heartbeat", {
        activeSeconds,
        durationBucket: activeDurationBucket(activeSeconds),
      });
      void flush();
    };

    const onProductEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ eventName?: unknown; properties?: unknown }>).detail;
      if (!detail || typeof detail.eventName !== "string") return;
      enqueue(detail.eventName, detail.properties && typeof detail.properties === "object" ? detail.properties as Record<string, unknown> : {});
      // Retention actions are relatively rare and should not wait for five
      // more events or a heartbeat that may never happen if the tab closes.
      void flush();
    };

    const updateActive = () => {
      clock.setActive(performance.now(), document.visibilityState === "visible" && document.hasFocus());
      if (document.visibilityState === "hidden" || !document.hasFocus()) recordHeartbeat();
    };
    const onInteraction = () => clock.interact(performance.now());
    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

    window.addEventListener(PRODUCT_EVENT_CHANNEL, onProductEvent);
    document.addEventListener("visibilitychange", updateActive);
    window.addEventListener("focus", updateActive);
    window.addEventListener("blur", updateActive);
    for (const name of activityEvents) window.addEventListener(name, onInteraction, { passive: true });

    const heartbeatTimer = window.setInterval(recordHeartbeat, 60_000);

    // Capture the landing channel before authentication redirects change the URL.
    // Store only a coarse channel; never persist raw referrers or UTM parameters.
    const currentChannel = acquisitionChannel(window.location.search, document.referrer);
    // Preserve a coarse first-touch channel through OAuth/email redirects.
    // Never persist UTM parameters, full referrers, or campaign identifiers.
    if (!sessionStorage.get(PENDING_CHANNEL_KEY)) {
      sessionStorage.set(PENDING_CHANNEL_KEY, currentChannel);
    }
    const recordAcquisitionIfNeeded = (userId: string) => {
      // A browser can host multiple accounts: attribution must be scoped per user.
      if (acquisitionRecorded.has(userId) || localStorage.get(`${ACQUISITION_RECORDED_KEY}:${userId}`) || acquisitionQueued) return;
      acquisitionQueued = true;
      const landingChannel = sessionStorage.get(PENDING_CHANNEL_KEY) || currentChannel;
      enqueue("acquisition_attributed", { channel: landingChannel });
    };

    let authRevision = 0;
    const applySession = (userId: string | null) => {
      if (disposed) return;
      const changed = delivery.setOwner(userId);
      if (sessionOwner !== userId) {
        if (sessionOwner) sessionStorage.remove(`${SESSION_KEY}:${sessionOwner}`);
        sessionOwner = userId;
        sessionId = userId ? sessionStorage.get(`${SESSION_KEY}:${userId}`) || makeSessionId() : makeSessionId();
        if (userId) sessionStorage.set(`${SESSION_KEY}:${userId}`, sessionId);
      }
      if (!userId) { acquisitionQueued = false; return; }
      if (changed) {
        clock = createActiveTimeClock(performance.now(), document.visibilityState === "visible" && document.hasFocus());
        acquisitionQueued = false;
        enqueue("session_started", { method: "authenticated" });
        const today = localDateKey();
        const key = `${LAST_ACTIVE_DAY_KEY}:${userId}`;
        const priorDay = localStorage.get(key);
        if (priorDay && priorDay !== today) enqueue("return_visit", { method: "new_day" });
        localStorage.set(key, today);
      }
      recordAcquisitionIfNeeded(userId);
      queueMicrotask(() => { if (!disposed) void flush(); });
    };
    const initialRevision = authRevision;
    void supabase.auth.getSession().then(({ data }) => {
      if (authRevision === initialRevision) applySession(data.session?.user.id || null);
    }).catch(() => { /* Missing analytics auth must never affect the product. */ });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authRevision++;
      applySession(session?.user.id || null);
    });

    return () => {
      recordHeartbeat();
      disposed = true;
      delivery.setOwner(null);
      window.clearInterval(heartbeatTimer);
      window.removeEventListener(PRODUCT_EVENT_CHANNEL, onProductEvent);
      document.removeEventListener("visibilitychange", updateActive);
      window.removeEventListener("focus", updateActive);
      window.removeEventListener("blur", updateActive);
      for (const name of activityEvents) window.removeEventListener(name, onInteraction);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
