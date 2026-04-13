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

const MOCK_DOCTORS_SEED: Doctor[] = [
  {
    id: 1,
    name: 'Dr. Priya Sharma',
    department: 'General',
    available: true,
    timing: 'Mon–Fri · 9:00 AM – 1:00 PM',
  },
  {
    id: 2,
    name: 'Dr. James Chen',
    department: 'Cardiology',
    available: true,
    timing: 'Mon–Wed · 10:00 AM – 4:00 PM',
  },
  {
    id: 3,
    name: 'Dr. Maria Garcia',
    department: 'Orthopedics',
    available: false,
    timing: 'Tue–Sat · 8:00 AM – 12:00 PM',
  },
];

let mockDoctorStore: Doctor[] | null = null;

function cloneMockDoctors(): Doctor[] {
  return MOCK_DOCTORS_SEED.map((d) => ({ ...d }));
}

function getMockDoctorStore(): Doctor[] {
  if (!mockDoctorStore) {
    mockDoctorStore = cloneMockDoctors();
  }
  return mockDoctorStore;
}

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
        : '';
  const timingRaw =
    typeof o.timing === 'string'
      ? o.timing
      : typeof o.timeSlots === 'string'
        ? o.timeSlots
        : typeof o.slots === 'string'
          ? o.slots
          : '';
  return {
    id,
    name,
    department: departmentRaw.trim() || 'General',
    available: Boolean(o.available),
    timing: timingRaw.trim() || '—',
  };
}

function normalizeDoctorsResponse(data: unknown): Doctor[] | null {
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
  try {
    const { data } = await api.get<unknown>('/doctors');
    const list = normalizeDoctorsResponse(data);
    if (!list?.length) {
      throw new Error('No doctors in response');
    }
    return list;
  } catch {
    await delay(450);
    return getMockDoctorStore();
  }
}

function mockDoctorsByDepartment(department: string): Doctor[] {
  const dept = department.trim() || 'General';
  if (dept === 'General') {
    return getMockDoctorStore().map((d) => ({ ...d }));
  }
  return [
    {
      id: 101,
      name: `Dr. ${dept} — Lead`,
      department: dept,
      available: true,
      timing: 'OPD · Mon–Sat',
    },
    {
      id: 102,
      name: `Dr. ${dept} — Associate`,
      department: dept,
      available: true,
      timing: 'OPD · Tue–Fri',
    },
  ];
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

  try {
    const { data } = await api.get<unknown>('/doctors', {
      params: { department: dept },
    });
    const list = normalizeDoctorsResponse(data);
    if (!list?.length) {
      throw new Error('No doctors in response');
    }
    return list;
  } catch {
    await delay(400);
    return mockDoctorsByDepartment(dept);
  }
}

/**
 * POST /update-availability
 */
export async function updateDoctorAvailability(
  payload: UpdateAvailabilityPayload,
): Promise<void> {
  try {
    await api.post('/update-availability', payload);
  } catch {
    await delay(400);
    const list = getMockDoctorStore();
    const doc = list.find((d) => d.id === payload.doctorId);
    if (doc) {
      doc.available = payload.available;
    }
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
