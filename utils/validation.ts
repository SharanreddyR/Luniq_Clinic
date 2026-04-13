export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Accepts a normal email or a phone with at least 10 digits (spaces/symbols allowed). */
export function isValidPhoneOrEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isValidEmail(v)) return true;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10;
}
