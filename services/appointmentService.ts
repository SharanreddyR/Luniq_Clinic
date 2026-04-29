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
  const { data } = await api.get<unknown>('/appointments');
  const list = normalizeAppointmentsResponse(data);
  if (!list?.length) {
    throw new Error('No appointments in response.');
  }
  return list;
}

/**
 * Mark visit completed.
 */
export async function markAppointmentCompleted(id: string): Promise<void> {
  await api.patch(`/appointments/${id}`, { status: 'completed' });
}
