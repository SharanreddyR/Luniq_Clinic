export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Digits only, max 15 — matches Laravel `phone` max length. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function isValidApplicationPhone(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}

/** India-style postal code (backend allows up to 10 chars). */
export function isValidPincode(pin: string): boolean {
  const p = pin.trim();
  return /^\d{6}$/.test(p);
}

/** Accepts a normal email or a phone with at least 10 digits (spaces/symbols allowed). */
export function isValidPhoneOrEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isValidEmail(v)) return true;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10;
}
