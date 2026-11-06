"use client";
import { useEffect, useState } from "react";
import type { Availability } from "@/lib/job-availability";

export function JobAvailabilityCheck({ url, language }: { url: string; language: "en" | "he" }) {
  const [result, setResult] = useState<Availability | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    setResult(null);
    fetch("/api/job-availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }), signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
      .then(value => { if (!controller.signal.aborted) setResult(value); })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: "unknown", reason: "unreachable", checkedAt: "" }); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [url, attempt]);
  const he = language === "he";
  const title = pending ? (he ? "בודקים אם המודעה עדיין מפורסמת…" : "Checking whether the listing is still published…") : result?.status === "published" ? (he ? "המודעה עדיין מפורסמת במקור" : "Still published at the source") : result?.status === "not-published" ? (he ? "המודעה כבר אינה מפורסמת בלוח המקור" : "No longer published on the source board") : (he ? "לא ניתן לאמת את תוקף המודעה" : "Listing availability could not be verified");
  const detail = result?.status === "published" ? (he ? "נמצאה במערכת הגיוס בזמן הבדיקה. יש לוודא באתר המעסיק לפני הגשה." : "Found in the recruiting system at check time. Confirm on the employer site before applying.") : result?.status === "not-published" ? (he ? "ייתכן שנסגרה או הוסרה. אפשר עדיין לשמור אותה לתיעוד." : "It may have closed or been removed. You can still save it for your records.") : result?.reason === "unsupported" ? (he ? "הבדיקה האוטומטית תומכת כרגע בקישורי Greenhouse ו־Lever. לקישור הזה יש לבדוק באתר המעסיק." : "Automatic checks currently support Greenhouse and Lever links. Check this listing on the employer site.") : (he ? "הבדיקה לא הצליחה. זו אינה הוכחה שהמשרה נסגרה." : "The check did not succeed. This does not mean the job is closed.");
  return <section className="smart-capture-detection" aria-label={he ? "תוקף המודעה" : "Listing availability"} aria-busy={pending} data-testid="job-availability"><div><p role="status"><strong>{title}</strong></p>{!pending && <><p>{detail}</p>{result?.checkedAt && <small>{he ? "נבדק: " : "Checked: "}{new Date(result.checkedAt).toLocaleString(he ? "he-IL" : "en-GB")}</small>}<p><a className="secondary-button" href={url} target="_blank" rel="noopener noreferrer">{he ? "בדיקה באתר המקור" : "Check original listing"}</a> <button type="button" className="secondary-button" onClick={() => setAttempt(current => current + 1)}>{he ? "בדיקה חוזרת" : "Check again"}</button></p></>}</div></section>;
}
