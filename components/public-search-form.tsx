"use client";

import type { FormEvent, ReactNode } from "react";
import { publicSearchHandoffProfile } from "@/lib/job-search";
import { LOCAL_WORKSPACE_OWNER_KEY } from "@/lib/workspace-access";

export function PublicSearchForm({ children, className, countries, cities }: {
  children: ReactNode; className: string; countries: Record<string, string>; cities: Record<string, string>;
}) {
  function rememberSearch(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const searchedAt = new Date().toISOString();
    (form.elements.namedItem("searchedAt") as HTMLInputElement).value = searchedAt;
    const fields = new FormData(form);
    const role = String(fields.get("q") || "").trim();
    const country = String(fields.get("country") || "").trim();
    const city = String(fields.get("city") || "").trim();
    if (!role || !country) return;
    try {
      // Public pages must never overwrite a workspace owned by a signed-in account.
      // The explicit URL handoff is applied only after the workspace access gate.
      if (localStorage.getItem(LOCAL_WORKSPACE_OWNER_KEY)) return;
      const profile = publicSearchHandoffProfile(role, countries[country] || country, cities[city] || city, searchedAt);
      localStorage.setItem("carvio.search-profile.v1", JSON.stringify(profile));
    } catch { /* Native GET navigation and URL handoff still work without storage. */ }
  }
  return <form data-find-search action="/find#search-sources" method="get" className={className} onSubmit={rememberSearch}>
    <input type="hidden" name="searchedAt" />
    {children}
  </form>;
}
