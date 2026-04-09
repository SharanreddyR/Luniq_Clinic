import { api } from '@/services/api';

export type Doctor = {
  id: number;
  name: string;
  available: boolean;
  /** Human-readable schedule, e.g. weekday hours */
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
    available: true,
    timing: 'Mon–Fri · 9:00 AM – 1:00 PM',
  },
  {
    id: 2,
    name: 'Dr. James Chen',
    available: true,
    timing: 'Mon–Wed · 10:00 AM – 4:00 PM',
  },
  {
    id: 3,
    name: 'Dr. Maria Garcia',
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

function normalizeDoctorsResponse(data: unknown): Doctor[] | null {
  if (Array.isArray(data)) {
    return data as Doctor[];
  }
  if (
    data &&
    typeof data === 'object' &&
    'doctors' in data &&
    Array.isArray((data as { doctors: unknown }).doctors)
  ) {
    return (data as { doctors: Doctor[] }).doctors;
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
