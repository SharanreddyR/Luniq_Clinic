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
