import { api } from '@/services/http';

export type ClinicTimingPayload = {
  openTime: string;
  closeTime: string;
  /** When true, clinic is open for visits */
  isOpen: boolean;
};

export type ClinicTimingSnapshot = {
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

/** One row from GET /clinic/profile → data.clinic_profile.timings */
export type ClinicWeeklySlot = {
  day: string;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

const WEEK_DAY_ORDER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

const TIMING_READ_ENDPOINTS = [
  '/admin/clinic-timings',
  '/clinic/clinic-timings',
  '/clinic/clinic-timing',
  '/clinic-timing',
] as const;

function pickText(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return null;
}

function pickBoolean(
  obj: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true' || s === '1' || s === 'open') return true;
      if (s === 'false' || s === '0' || s === 'closed') return false;
    }
  }
  return null;
}

function normalizeTiming(data: unknown): ClinicTimingSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if ('data' in o) {
    return normalizeTiming(o.data);
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const parsed = normalizeTiming(item);
      if (parsed) return parsed;
    }
    return null;
  }

  const openTime = pickText(o, ['open_time', 'openTime', 'from']);
  const closeTime = pickText(o, ['close_time', 'closeTime', 'to']);
  const isOpen = pickBoolean(o, ['is_open', 'isOpen', 'open', 'status']);
  if (!openTime || !closeTime || isOpen == null) return null;
  return { openTime, closeTime, isOpen };
}

function parseWeeklyTimingsPayload(payload: unknown): ClinicWeeklySlot[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const u = payload as Record<string, unknown>;
  const cp = u.clinic_profile;
  if (!cp || typeof cp !== 'object') return null;
  const timings = (cp as Record<string, unknown>).timings;
  if (!Array.isArray(timings)) return null;

  const slots: ClinicWeeklySlot[] = [];
  for (const row of timings) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const day = typeof r.day === 'string' ? r.day.trim() : '';
    if (!day) continue;
    const opensAt = typeof r.opens_at === 'string' ? r.opens_at : '';
    const closesAt = typeof r.closes_at === 'string' ? r.closes_at : '';
    const isClosed =
      r.is_closed === true ||
      r.is_closed === 1 ||
      r.is_closed === '1';
    slots.push({ day, opensAt, closesAt, isClosed });
  }

  if (slots.length === 0) return null;

  slots.sort(
    (a, b) =>
      (WEEK_DAY_ORDER[a.day.toLowerCase()] ?? 99) -
      (WEEK_DAY_ORDER[b.day.toLowerCase()] ?? 99),
  );
  return slots;
}

/**
 * Weekly Mon–Sun hours from clinic profile (same source as Filament / admin setup).
 */
export async function fetchWeeklyTimingsFromProfile(): Promise<
  ClinicWeeklySlot[] | null
> {
  try {
    const { data } = await api.get<{
      success?: boolean;
      data?: unknown;
    }>('/clinic/profile');
    const inner =
      data &&
      typeof data === 'object' &&
      'data' in data &&
      (data as { data: unknown }).data != null
        ? (data as { data: unknown }).data
        : data;
    return parseWeeklyTimingsPayload(inner);
  } catch {
    return null;
  }
}

export async function fetchClinicTiming(): Promise<ClinicTimingSnapshot | null> {
  for (const endpoint of TIMING_READ_ENDPOINTS) {
    try {
      const { data } = await api.get<unknown>(endpoint);
      const parsed = normalizeTiming(data);
      if (parsed) return parsed;
    } catch {
      // Try next endpoint fallback.
    }
  }
  return null;
}

/**
 * POST /clinic-timing — persist hours and open/closed flag on the server.
 */
export async function saveClinicTiming(
  payload: ClinicTimingPayload,
): Promise<void> {
  const bodySnake = {
    open_time: payload.openTime,
    close_time: payload.closeTime,
    is_open: payload.isOpen,
    updated_at: new Date().toISOString(),
  };
  const bodyCamel = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  const candidates: Array<() => Promise<unknown>> = [
    () => api.post('/admin/clinic-timings', bodySnake),
    () => api.put('/admin/clinic-timings', bodySnake),
    () => api.post('/clinic/clinic-timings', bodySnake),
    () => api.put('/clinic/clinic-timings', bodySnake),
    () => api.post('/clinic-timing', bodyCamel),
  ];

  for (const call of candidates) {
    try {
      await call();
      return;
    } catch {
      // Try next endpoint fallback.
    }
  }
  throw new Error('Could not save clinic timing.');
}
