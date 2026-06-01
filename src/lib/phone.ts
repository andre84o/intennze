// Normalize a phone number for a tel: link. Keeps digits and an optional
// single leading "+", stripping spaces, dashes and punctuation. Returns ""
// when there is no dialable number (caller hides the Call button).
export function normalizePhoneForTel(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}
