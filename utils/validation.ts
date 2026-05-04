export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Digits only, max 15 — matches Laravel `phone` max length. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

/**
 * Clinic registration (India): digits only, exactly 10 after normalize.
 * Strips leading country code `91` or trunk `0` when pasted as 11–12 digits.
 */
export function normalizeClinicRegistrationPhone(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) {
    d = d.slice(2);
  }
  if (d.length === 11 && d.startsWith('0')) {
    d = d.slice(1);
  }
  return d.slice(0, 10);
}

export function isValidClinicRegistrationPhone(digits: string): boolean {
  return /^\d{10}$/.test(digits);
}

/** India-style postal code (backend allows up to 10 chars). */
export function isValidPincode(pin: string): boolean {
  const p = pin.trim();
  return /^\d{6}$/.test(p);
}

/**
 * Login identifier: valid email, or exactly 10 digits after
 * {@link normalizeClinicRegistrationPhone} (same rules as clinic registration).
 */
export function isValidPhoneOrEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isValidEmail(v)) return true;
  return isValidClinicRegistrationPhone(normalizeClinicRegistrationPhone(v));
}

/** `login` API field: trimmed email, or 10-digit phone (normalized). */
export function normalizeLoginIdentifier(value: string): string {
  const t = value.trim();
  if (t.includes('@')) {
    return t;
  }
  return normalizeClinicRegistrationPhone(t);
}
