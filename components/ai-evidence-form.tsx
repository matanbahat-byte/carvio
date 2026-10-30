"use client";
import { useState } from "react";
import { aiEvidenceBullet, type AiEvidenceInput } from "@/lib/decision-support";

export function AiEvidenceForm({ language, requirements, onSave }: { language: "he" | "en"; requirements: { id?: string; requirement: string }[]; onSave: (text: string, ids: string[]) => void }) {
  const [input, setInput] = useState<AiEvidenceInput>({ task: "", tool: "", judgment: "", outcome: "" });
  const [ids, setIds] = useState<string[]>([]);
  const [preview, setPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [notRelevant, setNotRelevant] = useState(false);
  const labels = { task: language === "he" ? "באיזו משימה השתמשתם ב־AI?" : "In what task did you use AI?", tool: language === "he" ? "באיזה כלי או סוג כלי?" : "Which tool or type of tool?", judgment: language === "he" ? "מה נשאר באחריותכם ובשיקול דעתכם?" : "What remained your responsibility and judgment?", outcome: language === "he" ? "מה השתפר באופן שתוכלו להסביר?" : "What improved in a way you can explain?" };
  return <details className="panel"><summary>{language === "he" ? "ראיה לשימוש אחראי ב־AI (אופציונלי)" : "Evidence of responsible AI use (optional)"}</summary><p>{language === "he" ? "כתבו רק ניסיון ותוצאה אמיתיים. לא יתווספו מספרים או כישורים שלא מסרתם." : "Use only real experience and outcomes. No numbers or skills are added for you."}</p><label><input type="checkbox" checked={notRelevant} onChange={event => setNotRelevant(event.target.checked)} />{language === "he" ? "לא רלוונטי למשרה הזו" : "Not relevant to this role"}</label>{!notRelevant && <>
    {(Object.keys(labels) as (keyof AiEvidenceInput)[]).map(key => <label className="block" key={key}>{labels[key]}<textarea className="form-control" value={input[key]} onChange={event => { setInput(current => ({ ...current, [key]: event.target.value })); setPreview(""); }} /></label>)}
    <fieldset><legend>{language === "he" ? "לאילו דרישות הראיה רלוונטית? בחרו במפורש." : "Which requirements does this support? Select explicitly."}</legend>{requirements.filter(item => item.id).map(item => <label className="block" key={item.id}><input type="checkbox" checked={ids.includes(item.id!)} onChange={event => { setIds(current => event.target.checked ? [...current, item.id!] : current.filter(id => id !== item.id)); setPreview(""); }} />{item.requirement}</label>)}{!requirements.length && <p>{language === "he" ? "הוסיפו קודם דרישה למשרה." : "Add a requirement to the application first."}</p>}</fieldset>
    <button type="button" className="secondary-button" onClick={() => { const bullet = aiEvidenceBullet(input, ids, language); setPreview(bullet); setNotice(bullet ? "" : (language === "he" ? "השלימו משימה, כלי, אחריות, תוצאה ולפחות דרישה אחת." : "Add task, tool, responsibility, outcome and at least one requirement.")); }}>{language === "he" ? "בניית ניסוח מהראיה שלי" : "Build a bullet from my evidence"}</button>
    {preview && <><label>{language === "he" ? "ניסוח לבדיקה ועריכה" : "Review and edit"}<textarea className="form-control" value={preview} onChange={event => setPreview(event.target.value)} /></label><button type="button" className="primary-button" disabled={!preview.trim()} onClick={() => { onSave(preview.trim(), ids); setNotice(language === "he" ? "הראיה נשמרה וקושרה לדרישות שנבחרו." : "Evidence saved and linked to the selected requirements."); setPreview(""); }}>{language === "he" ? "שמירת הראיה והקישורים" : "Save evidence and links"}</button></>}
    {notice && <p role="status">{notice}</p>}
  </>}</details>;
}
