"use client";
import { useState } from "react";
import type { LinkedEvidence } from "@/lib/evidence-links";

type Requirement = { id?: string; requirement: string; ignored?: boolean };
type Props = { applicationId: string; items: LinkedEvidence[]; requirements: Requirement[]; language: "he" | "en"; onSave: (id: string, ids: string[]) => void };

function EvidenceLinkRow({ item, requirements, language, onSave }: { item: LinkedEvidence; requirements: Requirement[]; language: "he" | "en"; onSave: Props["onSave"] }) {
  const [ids, setIds] = useState(item.requirementIds);
  const [saved, setSaved] = useState(false);
  const he = language === "he";
  const available = requirements.filter(requirement => requirement.id && !requirement.ignored);
  const unavailable = item.requirementIds.filter(id => !available.some(requirement => requirement.id === id));
  return <details className="panel">
    <summary>{he ? "עריכת קישורי ראיה" : "Edit evidence links"}: {item.text.slice(0, 90)}{item.text.length > 90 ? "…" : ""}</summary>
    <p className="whitespace-pre-wrap">{item.text}</p>
    <fieldset><legend>{he ? "בחרו רק דרישות שהראיה תומכת בהן" : "Select only requirements this evidence supports"}</legend>
      {available.map(requirement => <label className="block" key={requirement.id}><input type="checkbox" checked={ids.includes(requirement.id!)} onChange={event => { setIds(current => event.target.checked ? [...current, requirement.id!] : current.filter(id => id !== requirement.id)); setSaved(false); }} /> {requirement.requirement}</label>)}
      {!available.length && <p>{he ? "אין דרישות פעילות לקישור. אפשר להוסיף דרישות בפרטי המשרה." : "No active requirements to link. Add requirements in the application details."}</p>}
    </fieldset>
    {!!unavailable.length && <p>{he ? "קישורים לדרישות שנמחקו או סומנו להתעלמות יוסרו בשמירה." : "Links to deleted or ignored requirements will be removed when you save."}</p>}
    <p>{he ? "ללא בחירה, רק הקישורים יוסרו. הראיה והערות ישנות יישמרו. קישור אינו אימות אוטומטי של התאמה." : "With no selection, only links are removed. Evidence and legacy notes stay saved. A link is not an automatic verification of fit."}</p>
    <button type="button" className="primary-button" onClick={() => { onSave(item.id, ids); setSaved(true); }}>{he ? "שמירת הקישורים" : "Save links"}</button>
    {saved && <p role="status">{he ? "הקישורים נשמרו; טקסט הראיה לא השתנה." : "Links saved; evidence text is unchanged."}</p>}
  </details>;
}

export function EvidenceLinksEditor({ applicationId, items, requirements, language, onSave }: Props) {
  const ownItems = items.filter(item => item.applicationId === applicationId);
  if (!ownItems.length) return null;
  return <details className="panel"><summary>{language === "he" ? "קישור ראיות שמורות לדרישות" : "Link saved evidence to requirements"}</summary>
    <p>{language === "he" ? "השתמשו באותה ראיה לכמה דרישות, בלי לשכפל את הטקסט. בחרו את הקישורים במפורש." : "Reuse one evidence item across requirements without duplicating its text. Choose links explicitly."}</p>
    {ownItems.map(item => <EvidenceLinkRow key={`${item.id}:${requirements.map(row => `${row.id}:${row.ignored}`).join("|")}`} item={item} requirements={requirements} language={language} onSave={onSave} />)}
  </details>;
}
