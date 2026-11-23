"use client";

import { useEffect } from "react";
import { emitProductEvent } from "@/lib/product-analytics";

/**
 * /find uses a native GET form and server rendering. Track the completed
 * navigation rather than the submit event, which can be lost on page unload.
 * No job titles, locations, URLs or other user-entered text are recorded.
 */
export function FindSearchAnalytics({ hasSearch }: { hasSearch: boolean }) {
  useEffect(() => {
    emitProductEvent("screen_viewed", { screen: "find" });
    if (hasSearch) {
      emitProductEvent("search_submitted", { method: "find_get" });
      emitProductEvent("search_sources_presented", { count: document.querySelectorAll("[data-search-provider]").length });
    }

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[data-search-provider]");
      if (!anchor) return;
      const source = anchor.dataset.searchProvider;
      if (!source || !["linkedin", "indeed", "google", "careers"].includes(source)) return;
      emitProductEvent("search_opened_by_source", { sourceType: source });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [hasSearch]);

  return null;
}
