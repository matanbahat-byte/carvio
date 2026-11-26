"use client";

import { useRef, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { publicSearchHandoffProfile } from "@/lib/job-search";
import { LOCAL_WORKSPACE_OWNER_KEY } from "@/lib/workspace-access";

function subscribeToSearch(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function savedSearchSnapshot() {
  try {
    // The public page cannot verify the owner of a signed-in workspace.
    return localStorage.getItem(LOCAL_WORKSPACE_OWNER_KEY) ? null : localStorage.getItem("carvio.search-profile.v1");
  } catch { return null; }
}

export function PublicSearchForm({ children, className, countries, cities, hasExplicitSearch, resumeLabel }: {
  children: ReactNode; className: string; countries: Record<string, string>; cities: Record<string, string>; hasExplicitSearch: boolean; resumeLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const snapshot = useSyncExternalStore(subscribeToSearch, savedSearchSnapshot, () => null);
  let saved: { role: string; country: string; location: string } | null = null;
  try {
    const profile = snapshot ? JSON.parse(snapshot) : null;
    if (!hasExplicitSearch && typeof profile?.role === "string" && profile.role.trim() && typeof profile.country === "string" && profile.country.trim()) {
      saved = { role: profile.role.trim().slice(0, 80), country: profile.country.trim().slice(0, 80), location: typeof profile.location === "string" ? profile.location.trim().slice(0, 80) : "" };
    }
  } catch { /* Invalid local preferences must not block searching. */ }
  function resumeSearch() {
    const form = formRef.current;
    if (!saved || !form) return;
    for (const [name, value] of [["q", saved.role], ["country", saved.country], ["city", saved.location]]) {
      (form.elements.namedItem(name) as HTMLInputElement).value = value;
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
  return <>
    {saved && <button type="button" onClick={resumeSearch} className="mb-4 grid w-full gap-1 rounded-2xl border border-teal-200 bg-teal-50 p-3 text-start text-sm text-teal-900"><strong>{resumeLabel}</strong><span className="break-words">{saved.role} · {[saved.country, saved.location].filter(Boolean).join(" · ")}</span></button>}
    <form ref={formRef} data-find-search action="/find#search-sources" method="get" className={className} onSubmit={rememberSearch}>
    <input type="hidden" name="searchedAt" />
    {children}
  </form></>;
}
