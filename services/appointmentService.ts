import { api } from '@/services/http';

export type AppointmentStatus = 'pending' | 'completed';

export type Appointment = {
  id: string;
  patientName: string;
  doctorName: string;
  /** ISO 8601 start time */
  startsAt: string;
  status: AppointmentStatus;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let mockAppointmentStore: Appointment[] | null = null;

function atLocalToday(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function atLocalDayOffset(
  dayOffset: number,
  hour: number,
  minute = 0,
): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function buildSeedAppointments(): Appointment[] {
  return [
    {
      id: 'apt-1',
      patientName: 'Ravi Kumar',
      doctorName: 'Dr. Priya Sharma',
      startsAt: atLocalToday(9, 30),
      status: 'pending',
    },
    {
      id: 'apt-2',
      patientName: 'Anita Desai',
      doctorName: 'Dr. James Chen',
      startsAt: atLocalToday(14, 0),
      status: 'pending',
    },
    {
      id: 'apt-3',
      patientName: 'Leo Martinez',
      doctorName: 'Dr. Maria Garcia',
      startsAt: atLocalToday(11, 15),
      status: 'completed',
    },
    {
      id: 'apt-4',
      patientName: 'Sofia Khan',
      doctorName: 'Dr. Priya Sharma',
      startsAt: atLocalDayOffset(1, 10, 0),
      status: 'pending',
    },
    {
      id: 'apt-5',
      patientName: 'James Okafor',
      doctorName: 'Dr. James Chen',
      startsAt: atLocalDayOffset(2, 15, 30),
      status: 'pending',
    },
    {
      id: 'apt-6',
      patientName: 'Mei Lin',
      doctorName: 'Dr. Maria Garcia',
      startsAt: atLocalDayOffset(5, 9, 0),
      status: 'pending',
    },
  ];
}

function getMockAppointmentStore(): Appointment[] {
  if (!mockAppointmentStore) {
    mockAppointmentStore = buildSeedAppointments();
  }
  return mockAppointmentStore;
}

function mapAppointmentRow(raw: unknown): Appointment | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  if (!id) return null;

  const patientName =
    typeof o.patientName === 'string'
      ? o.patientName
      : typeof o.patient === 'string'
        ? o.patient
        : o.patient &&
            typeof o.patient === 'object' &&
            typeof (o.patient as { name?: string }).name === 'string'
          ? (o.patient as { name: string }).name
          : '';

  const doctorName =
    typeof o.doctorName === 'string'
      ? o.doctorName
      : typeof o.doctor === 'string'
        ? o.doctor
        : o.doctor &&
            typeof o.doctor === 'object' &&
            typeof (o.doctor as { name?: string }).name === 'string'
          ? (o.doctor as { name: string }).name
          : '';

  const startsAtRaw =
    typeof o.startsAt === 'string'
      ? o.startsAt
      : typeof o.scheduledAt === 'string'
        ? o.scheduledAt
        : typeof o.startTime === 'string'
          ? o.startTime
          : typeof o.date === 'string'
            ? o.date
            : '';

  const statusRaw = o.status;
  const status: AppointmentStatus =
    statusRaw === 'completed' ? 'completed' : 'pending';

  if (!patientName.trim() || !doctorName.trim() || !startsAtRaw.trim()) {
    return null;
  }

  return {
    id,
    patientName: patientName.trim(),
    doctorName: doctorName.trim(),
    startsAt: startsAtRaw.trim(),
    status,
  };
}

function normalizeAppointmentsResponse(data: unknown): Appointment[] | null {
  const rows: unknown[] = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        'appointments' in data &&
        Array.isArray((data as { appointments: unknown }).appointments)
      ? (data as { appointments: unknown[] }).appointments
      : [];

  const list = rows
    .map(mapAppointmentRow)
    .filter((a): a is Appointment => a != null);
  return list.length ? list : null;
}

export function partitionAppointmentsByDay(
  list: Appointment[],
  now = new Date(),
): { today: Appointment[]; upcoming: Appointment[] } {
  const sod = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const today: Appointment[] = [];
  const upcoming: Appointment[] = [];

  for (const a of list) {
    const d = new Date(a.startsAt);
    if (Number.isNaN(d.getTime())) continue;
    const apptSod = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    ).getTime();
    if (apptSod === sod) today.push(a);
    else if (apptSod > sod) upcoming.push(a);
  }

  const byTime = (x: Appointment, y: Appointment) =>
    new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime();
  today.sort(byTime);
  upcoming.sort(byTime);
  return { today, upcoming };
}

/**
 * GET /appointments
 */
export async function fetchAppointments(): Promise<Appointment[]> {
  try {
    const { data } = await api.get<unknown>('/appointments');
    const list = normalizeAppointmentsResponse(data);
    if (!list?.length) {
      throw new Error('No appointments in response');
    }
    return list;
  } catch {
    await delay(450);
    return getMockAppointmentStore().map((a) => ({ ...a }));
  }
}

/**
 * Mark visit completed (optional PATCH; mock updates local store on failure).
 */
export async function markAppointmentCompleted(id: string): Promise<void> {
  try {
    await api.patch(`/appointments/${id}`, { status: 'completed' });
  } catch {
    await delay(350);
    const list = getMockAppointmentStore();
    const row = list.find((a) => a.id === id);
    if (row) {
      row.status = 'completed';
    }
  }
}
