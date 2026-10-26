export function authErrorMessage(error: unknown, language: "en" | "he") {
  const value = error as { status?: number; code?: string; message?: string } | null;
  if (value?.status === 429 || /rate|too many/i.test(value?.message || "")) {
    return language === "he" ? "נשלחו יותר מדי בקשות. המתינו כמה דקות ונסו שוב." : "Too many attempts. Please wait a few minutes and try again.";
  }
  if (/email.*invalid|invalid.*email/i.test(value?.message || "")) {
    return language === "he" ? "בדקו שכתובת האימייל נכונה ונסו שוב." : "Check your email address and try again.";
  }
  return language === "he"
    ? "לא הצלחנו להתחבר כרגע. נסו שוב בעוד רגע, או המשיכו במכשיר הזה ללא חשבון."
    : "We couldn’t connect right now. Try again shortly, or continue on this device without an account.";
}
