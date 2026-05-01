/** Local midnight for YYYY-MM-DD or ISO string (no TZ surprises on date-only). */
function parseLocalExpiryDay(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.slice(0, 10);
  const parts = dateOnly.split('-').map((x) => Number(x));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    const [y, m, d] = parts;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d
      ) {
        return dt;
      }
    }
  }
  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
  );
}

function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export type MembershipExpiryInfo = {
  /** Short formatted date e.g. "31 Dec 2026" */
  displayDate: string;
  /** Whole calendar days until expiry; 0 = expires today; negative = expired */
  daysRemaining: number | null;
  isExpired: boolean;
  /** Active membership with fewer than 30 days left */
  isUrgent: boolean;
};

/**
 * Expiry line for card lookup UI: date + days remaining; urgent when &lt; 30 days (not expired).
 */
export function getMembershipExpiryInfo(
  expiresAt: string | null | undefined,
): MembershipExpiryInfo {
  if (!expiresAt?.trim()) {
    return {
      displayDate: '—',
      daysRemaining: null,
      isExpired: false,
      isUrgent: false,
    };
  }

  const endDay = parseLocalExpiryDay(expiresAt);
  if (!endDay) {
    return {
      displayDate: expiresAt.trim(),
      daysRemaining: null,
      isExpired: false,
      isUrgent: false,
    };
  }

  const today = startOfTodayLocal();
  const diffMs = endDay.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / 86_400_000);
  const isExpired = daysRemaining < 0;
  const isUrgent = !isExpired && daysRemaining < 30;

  const displayDate = endDay.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return {
    displayDate,
    daysRemaining,
    isExpired,
    isUrgent,
  };
}
