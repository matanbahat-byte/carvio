"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareSearchButton({ path, labels }: {
  path: string; labels: { button: string; shared: string; copied: string; error: string };
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"shared" | "copied" | "error" | null>(null);
  async function shareSearch() {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    const data = { url: new URL(path, window.location.origin).toString() };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        try {
          await navigator.share(data);
          setFeedback("shared");
          return;
        } catch (error) {
          // Dismissing the native sheet must not copy anything or claim success.
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(data.url);
      setFeedback("copied");
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  }
  return <div className="mb-3 ms-2 inline-flex flex-col items-start gap-2 align-top">
    <button type="button" disabled={busy} onClick={shareSearch} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-700 bg-white px-4 py-3 text-sm font-bold text-teal-700 disabled:opacity-60"><Share2 size={16}/>{labels.button}</button>
    {feedback && <span role={feedback === "error" ? "alert" : "status"} className="text-sm text-slate-700">{labels[feedback]}</span>}
  </div>;
}
