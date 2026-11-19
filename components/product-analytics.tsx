"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  PRODUCT_EVENT_CHANNEL,
  acquisitionChannel,
  activeDurationBucket,
  localDateKey,
  sanitizeAnalyticsProperties,
  type AnalyticsProperties,
} from "@/lib/product-analytics";

type QueuedEvent = {
  event_name: string;
  properties: AnalyticsProperties;
  created_at: string;
};

const SESSION_KEY = "carvio.analytics-session.v1";
const LAST_ACTIVE_DAY_KEY = "carvio.analytics-last-active-day.v1";
const ACQUISITION_RECORDED_KEY = "carvio.analytics-acquisition-recorded.v1";
const PENDING_CHANNEL_KEY = "carvio.analytics-pending-channel.v1";

function makeSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProductAnalytics() {
  const supabaseRef = useRef(createClient());
  const sessionRef = useRef<Session | null>(null);
  const queueRef = useRef<QueuedEvent[]>([]);
  const flushingRef = useRef(false);
  const activeSecondsRef = useRef(0);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase || new URLSearchParams(window.location.search).get("demo") === "1") return;

    const sessionId = window.sessionStorage.getItem(SESSION_KEY) || makeSessionId();
    window.sessionStorage.setItem(SESSION_KEY, sessionId);

    const enqueue = (eventName: string, properties: Record<string, unknown> = {}) => {
      queueRef.current = [...queueRef.current.slice(-99), {
        event_name: eventName.slice(0, 80),
        properties: sanitizeAnalyticsProperties({ ...properties, sessionId }),
        created_at: new Date().toISOString(),
      }];
    };

    const flush = async () => {
      if (flushingRef.current || !sessionRef.current || !queueRef.current.length) return;
      flushingRef.current = true;
      try {
        while (sessionRef.current && queueRef.current.length) {
          const pending = queueRef.current.splice(0, 25);
          const rows = pending.map((event) => ({ ...event, user_id: sessionRef.current!.user.id }));
          const { error } = await supabase.from("product_events").insert(rows);
          if (error) {
            queueRef.current = [...pending, ...queueRef.current].slice(-100);
            break;
          }
        }
      } finally {
        flushingRef.current = false;
      }
    };

    const recordHeartbeat = () => {
      enqueue("session_heartbeat", {
        activeSeconds: activeSecondsRef.current,
        durationBucket: activeDurationBucket(activeSecondsRef.current),
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

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") recordHeartbeat();
    };

    window.addEventListener(PRODUCT_EVENT_CHANNEL, onProductEvent);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const activeTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) activeSecondsRef.current += 15;
    }, 15_000);
    const heartbeatTimer = window.setInterval(recordHeartbeat, 60_000);

    // Capture the landing channel before authentication redirects change the URL.
    // Store only a coarse channel; never persist raw referrers or UTM parameters.
    const currentChannel = acquisitionChannel(window.location.search, document.referrer);
    // Preserve a coarse first-touch channel through OAuth/email redirects.
    // Never persist UTM parameters, full referrers, or campaign identifiers.
    if (!window.localStorage.getItem(ACQUISITION_RECORDED_KEY) && !window.sessionStorage.getItem(PENDING_CHANNEL_KEY)) {
      window.sessionStorage.setItem(PENDING_CHANNEL_KEY, currentChannel);
    }
    const recordAcquisitionIfNeeded = () => {
      if (window.localStorage.getItem(ACQUISITION_RECORDED_KEY)) return;
      const landingChannel = window.sessionStorage.getItem(PENDING_CHANNEL_KEY) || currentChannel;
      enqueue("acquisition_attributed", { channel: landingChannel });
      window.localStorage.setItem(ACQUISITION_RECORDED_KEY, "1");
      window.sessionStorage.removeItem(PENDING_CHANNEL_KEY);
    };

    supabase.auth.getSession().then(({ data }) => {
      sessionRef.current = data.session;
      if (!data.session) return;
      enqueue("session_started", { method: "authenticated" });
      recordAcquisitionIfNeeded();
      const today = localDateKey();
      const priorDay = window.localStorage.getItem(LAST_ACTIVE_DAY_KEY);
      if (priorDay && priorDay !== today) enqueue("return_visit", { method: "new_day" });
      window.localStorage.setItem(LAST_ACTIVE_DAY_KEY, today);
      void flush();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
      if (session) {
        recordAcquisitionIfNeeded();
        void flush();
      }
    });

    return () => {
      recordHeartbeat();
      window.clearInterval(activeTimer);
      window.clearInterval(heartbeatTimer);
      window.removeEventListener(PRODUCT_EVENT_CHANNEL, onProductEvent);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
