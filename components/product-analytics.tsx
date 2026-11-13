"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  PRODUCT_EVENT_CHANNEL,
  activeDurationBucket,
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
      const pending = queueRef.current.splice(0, 25);
      const rows = pending.map((event) => ({ ...event, user_id: sessionRef.current!.user.id }));
      const { error } = await supabase.from("product_events").insert(rows);
      if (error) queueRef.current = [...pending, ...queueRef.current].slice(-100);
      flushingRef.current = false;
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
      if (queueRef.current.length >= 5) void flush();
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

    supabase.auth.getSession().then(({ data }) => {
      sessionRef.current = data.session;
      if (!data.session) return;
      enqueue("session_started", { method: "authenticated" });
      const today = new Date().toISOString().slice(0, 10);
      const priorDay = window.localStorage.getItem(LAST_ACTIVE_DAY_KEY);
      if (priorDay && priorDay !== today) enqueue("return_visit", { method: "new_day" });
      window.localStorage.setItem(LAST_ACTIVE_DAY_KEY, today);
      void flush();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
      if (session) void flush();
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
