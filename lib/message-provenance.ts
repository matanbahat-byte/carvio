import type { MessageProfile } from "./decision-support";

const contentFields = ["recipientName", "company", "role", "senderName", "context", "value"] as const;
export type MessageProvenance = { language: "he" | "en"; inputs: Partial<Record<keyof MessageProfile, string>> };

// Component memory only: never write inputs to analytics or external services.
export function messageProvenance(profile: MessageProfile, language: "he" | "en"): MessageProvenance {
  const inputs: MessageProvenance["inputs"] = { intent: profile.intent, tone: profile.tone };
  if (profile.intent !== "Thank them") inputs.recipientType = profile.recipientType;
  for (const field of contentFields) if (profile[field].trim()) inputs[field] = profile[field].trim();
  return { language, inputs };
}

export function messageInputsChanged(snapshot: MessageProvenance, profile: MessageProfile, language: "he" | "en") {
  return JSON.stringify(snapshot) !== JSON.stringify(messageProvenance(profile, language));
}
