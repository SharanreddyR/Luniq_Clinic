/** Display name (wordmark splits on spaces). Override with `EXPO_PUBLIC_APP_NAME`. */
export const APP_NAME =
  String(process.env.EXPO_PUBLIC_APP_NAME ?? '').trim() || 'Luniq Clinic';

/** Recipient for admin visit-approval mail. Override with `EXPO_PUBLIC_ADMIN_CLAIM_APPROVAL_EMAIL`. */
export const ADMIN_CLAIM_APPROVAL_EMAIL =
  String(process.env.EXPO_PUBLIC_ADMIN_CLAIM_APPROVAL_EMAIL ?? '').trim() ||
  'approvals@luniqhealth.com';

/**
 * Laravel JSON API base (`routes/api.php` + `v1` prefix).
 * Resolves to `…/api/v1` so paths like `/auth/login` match the backend.
 */
const DEFAULT_API_BASE_URL = 'https://card.luniqhealth.com/api/v1';

function ensureApiBaseUrl(raw: string | undefined | null): string {
  const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    let path = u.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '') {
      return `${u.origin}/api/v1`;
    }
    // Env often uses `…/api` without `/v1` — backend expects `/api/v1/*`
    if (path === '/api') {
      return `${u.origin}/api/v1`;
    }
    return `${u.origin}${path}`;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return ensureApiBaseUrl(String(fromEnv));
  }
  return ensureApiBaseUrl(DEFAULT_API_BASE_URL);
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * When GET /clinic/services returns no rows, show {@link MOCK_CLINIC_VISIT_CATALOG}
 * so Visit chips can be exercised without backend data. Visit submit stays disabled
 * until real services exist. On by default in dev; set `EXPO_PUBLIC_USE_MOCK_CLINIC_SERVICES=1`
 * for release builds if needed.
 */
export const USE_MOCK_CLINIC_SERVICES_WHEN_EMPTY =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  String(process.env.EXPO_PUBLIC_USE_MOCK_CLINIC_SERVICES ?? '').trim() === '1';
