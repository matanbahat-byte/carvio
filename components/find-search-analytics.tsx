"use client";

import { useEffect } from "react";
import { emitProductEvent } from "@/lib/product-analytics";

/**
 * /find uses a native GET form and server rendering. Track the completed
 * navigation only when a recent explicit form submission is pending.
 * No job titles, locations, URLs or other user-entered text are recorded.
 */
const pendingKey = "carvio:find-search-pending";

export function FindSearchAnalytics({ hasSearch }: { hasSearch: boolean }) {
  useEffect(() => {
    emitProductEvent("screen_viewed", { screen: "find" });
    if (hasSearch) {
      let submitted = false;
      try {
        const pending = Number(sessionStorage.getItem(pendingKey));
        sessionStorage.removeItem(pendingKey);
        submitted = pending > 0 && Date.now() - pending >= 0 && Date.now() - pending < 60000;
      } catch { /* Storage may be unavailable; do not infer a submission. */ }
      if (submitted) emitProductEvent("search_submitted", { method: "find_get" });
      emitProductEvent("search_sources_presented", { count: document.querySelectorAll("[data-search-provider]").length });
    }

    const onSubmit = (event: SubmitEvent) => {
      if (!(event.target instanceof HTMLFormElement) || !event.target.matches("form[data-find-search]")) return;
      try { sessionStorage.setItem(pendingKey, String(Date.now())); } catch { /* Search must still work. */ }
    };
    document.addEventListener("submit", onSubmit);
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[data-search-provider]");
      if (!anchor) return;
      const source = anchor.dataset.searchProvider;
      if (!source || !["linkedin", "indeed", "google", "careers"].includes(source)) return;
      emitProductEvent("search_opened_by_source", { sourceType: source });
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, [hasSearch]);

  return null;
}
