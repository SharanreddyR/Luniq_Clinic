import { api } from '@/services/http';

export type Doctor = {
  id: number;
  name: string;
  department: string;
  available: boolean;
  /** Human-readable schedule / time slots, e.g. weekday hours */
  timing: string;
};

export type UpdateAvailabilityPayload = {
  doctorId: number;
  available: boolean;
};

const DOCTOR_LIST_ENDPOINTS = [
  '/admin/doctors',
  '/clinic/doctors',
  '/doctors',
] as const;

function mapDoctorRow(raw: unknown): Doctor | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;
  const name = typeof o.name === 'string' ? o.name : String(o.name ?? '');
  const departmentRaw =
    typeof o.department === 'string'
      ? o.department
      : typeof o.dept === 'string'
        ? o.dept
        : typeof o.specialization === 'string'
          ? o.specialization
        : '';
  const timingRaw =
    typeof o.timing === 'string'
      ? o.timing
      : typeof o.timeSlots === 'string'
        ? o.timeSlots
        : typeof o.slots === 'string'
          ? o.slots
          : typeof o.qualification === 'string'
            ? o.qualification
          : '';
  const status =
    typeof o.status === 'string' ? o.status.toLowerCase().trim() : '';
  const available =
    typeof o.is_available === 'boolean'
      ? o.is_available
      : typeof o.available === 'boolean'
        ? o.available
        : status === 'available';
  return {
    id,
    name,
    department: departmentRaw.trim() || 'General',
    available,
    timing: timingRaw.trim() || '—',
  };
}

function normalizeDoctorsResponse(data: unknown): Doctor[] | null {
  if (
    data &&
    typeof data === 'object' &&
    'data' in data
  ) {
    return normalizeDoctorsResponse((data as { data: unknown }).data);
  }
  if (Array.isArray(data)) {
    const list = data
      .map(mapDoctorRow)
      .filter((d): d is Doctor => d != null);
    return list.length ? list : null;
  }
  if (
    data &&
    typeof data === 'object' &&
    'doctors' in data &&
    Array.isArray((data as { doctors: unknown }).doctors)
  ) {
    const arr = (data as { doctors: unknown[] }).doctors;
    const list = arr
      .map(mapDoctorRow)
      .filter((d): d is Doctor => d != null);
    return list.length ? list : null;
  }
  return null;
}

/**
 * GET /doctors
 */
export async function fetchDoctors(): Promise<Doctor[]> {
  for (const endpoint of DOCTOR_LIST_ENDPOINTS) {
    try {
      const { data } = await api.get<unknown>(endpoint);
      const list = normalizeDoctorsResponse(data);
      if (list?.length) {
        return list;
      }
    } catch {
      // Try next endpoint fallback.
    }
  }
  return [];
}

/**
 * GET /doctors?department=… (e.g. General)
 */
export async function fetchDoctorsByDepartment(
  department: string,
): Promise<Doctor[]> {
  const dept = department.trim();
  if (!dept) {
    return [];
  }

  for (const endpoint of DOCTOR_LIST_ENDPOINTS) {
    try {
      const { data } = await api.get<unknown>(endpoint, {
        params: { department: dept },
      });
      const list = normalizeDoctorsResponse(data);
      if (list?.length) {
        return list;
      }
    } catch {
      // Try next endpoint fallback.
    }
  }
  return [];
}

/**
 * POST /update-availability
 */
export async function updateDoctorAvailability(
  payload: UpdateAvailabilityPayload,
): Promise<void> {
  const status = payload.available ? 'available' : 'unavailable';
  const candidates: Array<() => Promise<unknown>> = [
    () =>
      api.put(`/admin/doctors/${payload.doctorId}/status`, {
        status,
      }),
    () =>
      api.put(`/clinic/doctors/${payload.doctorId}/status`, {
        status,
      }),
    () =>
      api.patch(`/admin/doctors/${payload.doctorId}`, {
        available: payload.available,
      }),
    () =>
      api.post('/update-availability', payload),
  ];

  for (const call of candidates) {
    try {
      await call();
      return;
    } catch {
      // Try next endpoint fallback.
    }
  }
  throw new Error('Could not update doctor availability.');
}

