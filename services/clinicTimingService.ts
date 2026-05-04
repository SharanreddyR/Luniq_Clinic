import { isAxiosError } from 'axios';

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

// --- GET/POST /clinic/timings (weekly), leave / remove-leave ---

export type ClinicTimingsApiRow = {
  day: string;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  is_open_now: boolean;
};

export type ClinicTimingBulkSaveRow = {
  day: string;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

function timingsApiMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const raw = err.response?.data;
    if (raw && typeof raw === 'object') {
      const m = (raw as Record<string, unknown>).message;
      if (typeof m === 'string' && m.trim()) return m.trim();
      const errs = (raw as Record<string, unknown>).errors;
      if (errs && typeof errs === 'object') {
        const lines = Object.entries(errs as Record<string, unknown>).flatMap(
          ([k, v]) =>
            Array.isArray(v)
              ? v.map((x) => `${k}: ${String(x)}`)
              : [`${k}: ${String(v)}`],
        );
        if (lines.length) return lines.join('\n');
      }
    }
    const st = err.response?.status;
    const msg = typeof err.message === 'string' ? err.message.trim() : '';
    if (msg) return st ? `${msg} (${st})` : msg;
    return st ? `Request failed (${st})` : 'Request failed.';
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return 'Something went wrong.';
}

/** Normalize API time (`09:00:00` or `9:30`) to `HH:mm` for inputs and POST body. */
export function apiTimeToHi(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '';
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Valid `HH:mm` → value for API; invalid → null */
export function hiToApiTime(value: string): string | null {
  const t = value.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseTimingsApiRow(raw: unknown): ClinicTimingsApiRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const day = typeof o.day === 'string' ? o.day.trim().toLowerCase() : '';
  if (!day) return null;
  const opens =
    o.opens_at == null || o.opens_at === ''
      ? null
      : String(o.opens_at);
  const closes =
    o.closes_at == null || o.closes_at === ''
      ? null
      : String(o.closes_at);
  return {
    day,
    opens_at: opens,
    closes_at: closes,
    is_closed: Boolean(o.is_closed),
    is_open_now: Boolean(o.is_open_now),
  };
}

/**
 * GET /clinic/timings
 */
export async function fetchClinicTimingsApi(): Promise<ClinicTimingsApiRow[]> {
  try {
    const { data } = await api.get<unknown>('/clinic/timings');
    if (!data || typeof data !== 'object') return [];
    const b = data as Record<string, unknown>;
    if (b.success === false) {
      const msg =
        typeof b.message === 'string' && b.message.trim()
          ? b.message.trim()
          : 'Could not load timings.';
      throw new Error(msg);
    }
    const arr = Array.isArray(b.data) ? b.data : [];
    const rows = arr
      .map(parseTimingsApiRow)
      .filter((x): x is ClinicTimingsApiRow => x != null);
    rows.sort(
      (a, b) =>
        (WEEK_DAY_ORDER[a.day] ?? 99) - (WEEK_DAY_ORDER[b.day] ?? 99),
    );
    return rows;
  } catch (err) {
    throw new Error(timingsApiMessage(err));
  }
}

function assertBulkRowsValid(rows: ClinicTimingBulkSaveRow[]): void {
  for (const r of rows) {
    if (!r.is_closed) {
      const o = r.opens_at?.trim();
      const c = r.closes_at?.trim();
      if (!o || !c) {
        throw new Error(
          `Opens at and closes at are required for ${r.day} when not closed.`,
        );
      }
    }
  }
}

/**
 * POST /clinic/timings — body `{ timings: [...] }` uses `H:i` times per Laravel validation.
 */
export async function saveClinicTimingsBulk(
  rows: ClinicTimingBulkSaveRow[],
): Promise<ClinicTimingsApiRow[]> {
  if (!rows.length) {
    throw new Error('No timings to save.');
  }
  assertBulkRowsValid(rows);

  const timings = rows.map((r) => ({
    day: r.day,
    opens_at: r.is_closed ? null : hiToApiTime(String(r.opens_at ?? '')),
    closes_at: r.is_closed ? null : hiToApiTime(String(r.closes_at ?? '')),
    is_closed: r.is_closed,
  }));

  for (const t of timings) {
    if (!t.is_closed && (!t.opens_at || !t.closes_at)) {
      throw new Error(`Invalid open/close time for ${t.day}. Use HH:mm.`);
    }
  }

  try {
    const { data } = await api.post<unknown>('/clinic/timings', { timings });
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response.');
    }
    const b = data as Record<string, unknown>;
    if (b.success === false) {
      const msg =
        typeof b.message === 'string' && b.message.trim()
          ? b.message.trim()
          : 'Could not save timings.';
      throw new Error(msg);
    }
    const arr = Array.isArray(b.data) ? b.data : [];
    const out = arr
      .map(parseTimingsApiRow)
      .filter((x): x is ClinicTimingsApiRow => x != null);
    out.sort(
      (a, b) =>
        (WEEK_DAY_ORDER[a.day] ?? 99) - (WEEK_DAY_ORDER[b.day] ?? 99),
    );
    return out;
  } catch (err) {
    if (err instanceof Error && !isAxiosError(err)) throw err;
    throw new Error(timingsApiMessage(err));
  }
}

/** POST /clinic/timings/leave — `{ day }` */
export async function markClinicTimingLeave(day: string): Promise<string> {
  const d = day.trim().toLowerCase();
  try {
    const { data } = await api.post<{ success?: boolean; message?: string }>(
      '/clinic/timings/leave',
      { day: d },
    );
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      data.success === false
    ) {
      throw new Error(
        typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : 'Could not mark leave.',
      );
    }
    return typeof data?.message === 'string' && data.message.trim()
      ? data.message.trim()
      : `${d} marked as leave.`;
  } catch (err) {
    throw new Error(timingsApiMessage(err));
  }
}

/** POST /clinic/timings/remove-leave — `{ day, opens_at, closes_at }` as `H:i` */
export async function removeClinicTimingLeave(
  day: string,
  opensAt: string,
  closesAt: string,
): Promise<string> {
  const d = day.trim().toLowerCase();
  const o = hiToApiTime(opensAt);
  const c = hiToApiTime(closesAt);
  if (!o || !c) {
    throw new Error('Use valid times (HH:mm) to reopen.');
  }
  try {
    const { data } = await api.post<{ success?: boolean; message?: string }>(
      '/clinic/timings/remove-leave',
      { day: d, opens_at: o, closes_at: c },
    );
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      data.success === false
    ) {
      throw new Error(
        typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : 'Could not reopen day.',
      );
    }
    return typeof data?.message === 'string' && data.message.trim()
      ? data.message.trim()
      : `${d} reopened.`;
  } catch (err) {
    throw new Error(timingsApiMessage(err));
  }
}
