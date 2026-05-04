import { api } from '@/services/http';
import { isAxiosError } from 'axios';

/** Values stored on `appointments.status` (clinic list filter). */
export type ClinicAppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type ClinicAppointment = {
  id: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  doctorName: string;
  /** Display strings from API */
  dateLabel: string;
  timeLabel: string;
  /** Parsed for Today / Upcoming grouping */
  startsAt: string;
  reason: string | null;
  status: ClinicAppointmentStatus;
  contactPhone: string | null;
  contactName: string | null;
};

export const CLINIC_APPOINTMENT_STATUSES: ClinicAppointmentStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'rejected',
  'cancelled',
];

function formatJsonErrorBody(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as { errors?: Record<string, string[]>; message?: string };
  if (b.errors && typeof b.errors === 'object') {
    const lines = Object.entries(b.errors).flatMap(([key, msgs]) =>
      (Array.isArray(msgs) ? msgs : []).map(
        (m) => `${key.replace(/_/g, ' ')}: ${m}`,
      ),
    );
    if (lines.length > 0) return lines.join('\n');
  }
  if (typeof b.message === 'string' && b.message.trim()) {
    return b.message.trim();
  }
  return '';
}

export function appointmentApiErrorMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    const detailed = formatJsonErrorBody(e.response?.data);
    if (detailed) return detailed;
  }
  return e instanceof Error ? e.message : fallback;
}

function normalizeStatus(raw: unknown): ClinicAppointmentStatus {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (
    s === 'pending' ||
    s === 'confirmed' ||
    s === 'rejected' ||
    s === 'cancelled' ||
    s === 'completed'
  ) {
    return s;
  }
  return 'pending';
}

function parseStartsAtIso(dateLabel: string, timeLabel: string): string {
  const t = timeLabel.trim();
  const hhmm = t.length >= 5 ? t.slice(0, 5) : t;
  const d = new Date(`${dateLabel.trim()} ${hhmm}`);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return '';
}

function mapClinicRow(raw: unknown): ClinicAppointment | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  if (!id) return null;

  const patientName =
    typeof o.patient_name === 'string' ? o.patient_name.trim() : '';
  const doctorName =
    typeof o.doctor_name === 'string' ? o.doctor_name.trim() : 'Any Doctor';
  const dateLabel = typeof o.date === 'string' ? o.date.trim() : '';
  const timeLabel =
    typeof o.time === 'string' ? o.time.trim() : '';
  const reason =
    typeof o.reason === 'string' && o.reason.trim() ? o.reason.trim() : null;
  const status = normalizeStatus(o.status);

  const patientAge =
    typeof o.patient_age === 'number' && Number.isFinite(o.patient_age)
      ? o.patient_age
      : null;
  const patientGender =
    typeof o.patient_gender === 'string' && o.patient_gender.trim()
      ? o.patient_gender.trim()
      : null;
  const contactPhone =
    typeof o.contact_phone === 'string' && o.contact_phone.trim()
      ? o.contact_phone.trim()
      : null;
  const contactName =
    typeof o.contact_name === 'string' && o.contact_name.trim()
      ? o.contact_name.trim()
      : null;

  if (!patientName) return null;

  const startsAt =
    dateLabel && timeLabel
      ? parseStartsAtIso(dateLabel, timeLabel)
      : '';

  return {
    id,
    patientName,
    patientAge,
    patientGender,
    doctorName,
    dateLabel: dateLabel || '—',
    timeLabel: timeLabel || '—',
    startsAt: startsAt || new Date(0).toISOString(),
    reason,
    status,
    contactPhone,
    contactName,
  };
}

function rowsFromClinicPayload(body: unknown): unknown[] {
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data;
  return [];
}

export type ClinicAppointmentsPage = {
  appointments: ClinicAppointment[];
  meta: {
    currentPage: number;
    lastPage: number;
    total: number;
    hasMore: boolean;
  };
};

/**
 * GET /clinic/appointments — `status` defaults to `pending` on the server.
 */
export async function fetchClinicAppointmentsPage(params: {
  status: ClinicAppointmentStatus;
  page?: number;
  perPage?: number;
}): Promise<ClinicAppointmentsPage> {
  const { status, page = 1, perPage = 30 } = params;
  const { data } = await api.get<unknown>('/clinic/appointments', {
    params: { status, page, per_page: perPage },
  });

  if (!data || typeof data !== 'object') {
    return {
      appointments: [],
      meta: { currentPage: 1, lastPage: 1, total: 0, hasMore: false },
    };
  }

  const o = data as Record<string, unknown>;
  const rows = rowsFromClinicPayload(data);
  const appointments = rows
    .map(mapClinicRow)
    .filter((a): a is ClinicAppointment => a != null);

  const metaRaw = o.meta;
  const m =
    metaRaw && typeof metaRaw === 'object'
      ? (metaRaw as Record<string, unknown>)
      : {};

  return {
    appointments,
    meta: {
      currentPage: Number(m.current_page) || 1,
      lastPage: Number(m.last_page) || 1,
      total: Number(m.total) || appointments.length,
      hasMore: Boolean(m.has_more),
    },
  };
}

/** PUT /clinic/appointments/{id}/confirm */
export async function confirmClinicAppointment(
  id: string,
  notes?: string | null,
): Promise<void> {
  const trimmed = notes?.trim();
  await api.put(`/clinic/appointments/${id}/confirm`, {
    ...(trimmed ? { notes: trimmed } : {}),
  });
}

/** PUT /clinic/appointments/{id}/reject */
export async function rejectClinicAppointment(
  id: string,
  reason: string,
): Promise<void> {
  await api.put(`/clinic/appointments/${id}/reject`, {
    reason: reason.trim(),
  });
}

export function partitionAppointmentsByDay(
  list: ClinicAppointment[],
  now = new Date(),
): { today: ClinicAppointment[]; upcoming: ClinicAppointment[] } {
  const sod = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const today: ClinicAppointment[] = [];
  const upcoming: ClinicAppointment[] = [];

  for (const a of list) {
    const d = new Date(a.startsAt);
    if (Number.isNaN(d.getTime()) || d.getTime() === 0) {
      upcoming.push(a);
      continue;
    }
    const apptSod = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    ).getTime();
    if (apptSod === sod) today.push(a);
    else if (apptSod > sod) upcoming.push(a);
    else upcoming.push(a);
  }

  const byTime = (x: ClinicAppointment, y: ClinicAppointment) =>
    new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime();
  today.sort(byTime);
  upcoming.sort(byTime);
  return { today, upcoming };
}
