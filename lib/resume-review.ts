export function reviewResumeText(text: string, language: string) {
  const he = language === "he";
  const t = (a: string, b: string) => he ? a : b;
  const clean = text.trim();
  if (!clean) return [t("הדביקו טקסט כדי להתחיל בבדיקה.", "Paste CV text to start the review.")];
  const results: string[] = [];
  const bullets = clean.split(/\r?\n/).filter(line => /^\s*(?:[•●▪◦‣–—*\-]|\d+[.)])\s*/u.test(line));
  if (bullets.length) results.push(t("זוהו שורות בולט בטקסט.", "Bullet lines detected in the text."));
  const skills = /(?:skills|expertise|competenc(?:ies|y)|technologies|כישורים|מיומנויות|מומחיות|יכולות|כלים וטכנולוגיות)/iu.test(clean);
  if (skills) results.push(t("זוהתה התייחסות לכישורים או למומחיות.", "Skills or expertise wording detected."));
  const numeric = /\d/u.test(clean);
  if (numeric) results.push(t("זוהו מספרים בטקסט; לא ניתן לקבוע אוטומטית אם הם הישגים או תאריכים.", "Numbers detected; this check cannot determine whether they represent achievements or dates."));
  if (!results.length) results.push(t("לא זוהו סימנים מבניים מוכרים בטקסט שחולץ; אין בכך הוכחה שחסרים כישורים או הישגים.", "No recognized structural markers were detected in the extracted text; this does not establish that skills or achievements are missing."));
  results.push(t("בדקו ידנית את התאמת הניסיון לדרישות המשרה. בדיקה מבוססת כללים אינה מעריכה איכות מקצועית או התאמה מלאה.", "Manually compare the experience with the job requirements. A rules-based check cannot assess professional quality or overall fit."));
  return results;
}

export function cleanResumeDraft(text: string) {
  return text.trim().replace(/\r\n/g, "\n").replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}
