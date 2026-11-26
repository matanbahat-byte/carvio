"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { publicSearchHandoffProfile } from "@/lib/job-search";
import { LOCAL_WORKSPACE_OWNER_KEY } from "@/lib/workspace-access";

export function PublicSearchForm({ children, className, countries, cities }: {
  children: ReactNode; className: string; countries: Record<string, string>; cities: Record<string, string>;
}) {
  const [lastSearch, setLastSearch] = useState<{ role: string; country: string; city: string; he: boolean } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (["q", "country", "city"].some(key => params.has(key))) return;
    try {
      if (localStorage.getItem(LOCAL_WORKSPACE_OWNER_KEY)) return;
      const saved = JSON.parse(localStorage.getItem("carvio.search-profile.v1") || "null");
      const field = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 80) : "";
      const role = field(saved?.role), country = field(saved?.country), city = field(saved?.location);
      if (role && country) setLastSearch({ role, country, city, he: params.get("lang") !== "en" });
    } catch { /* Storage is optional. */ }
  }, []);
  function resumeSearch(form: HTMLFormElement) {
    if (!lastSearch) return;
    for (const [name, value] of Object.entries({ q: lastSearch.role, country: lastSearch.country, city: lastSearch.city })) {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement) input.value = value;
    }
    form.requestSubmit();
  }
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
    {lastSearch && <button type="button" className="col-span-full min-w-0 rounded-xl border border-teal-200 bg-teal-50 p-3 text-start text-sm text-teal-900" onClick={event => { if (event.currentTarget.form) resumeSearch(event.currentTarget.form); }}><strong className="block">{lastSearch.he ? "המשך החיפוש האחרון" : "Continue last search"}</strong><span className="block break-words">{[lastSearch.role, lastSearch.country, lastSearch.city].filter(Boolean).join(" · ")}</span></button>}
  </form>;
}
