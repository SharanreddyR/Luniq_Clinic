/**
 * Replace with your clinic API base URL.
 * Example: https://api.yourclinic.com/v1
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com/v1';

export const APP_NAME = 'Clinic App';

/** Receives visit PDF for admin approval (set EXPO_PUBLIC_ADMIN_CLAIM_EMAIL in env). */
export const ADMIN_CLAIM_APPROVAL_EMAIL =
  process.env.EXPO_PUBLIC_ADMIN_CLAIM_EMAIL ?? 'claims-admin@example.com';
