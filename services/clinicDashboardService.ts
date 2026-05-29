import { isAxiosError } from 'axios';

import { api } from '@/services/http';

export type ClinicDashboardStats = {
  visits: {
    today: number;
    open: number;
    this_month: number;
  };
  claims: {
    pending: number;
    approved: number;
    settled: number;
    this_month: number;
    total_approved_amount: string;
  };
  appointments: {
    today: number;
    pending: number;
    confirmed_today: number;
  };
  setup: {
    is_complete: boolean;
  };
};

type ClinicDashboardEnvelope = {
  success: boolean;
  message?: string;
  data?: ClinicDashboardStats;
};

function asCount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function asMoneyString(v: unknown): string {
  if (v == null || v === '') return '0';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim() || '0';
}

function parseDashboardPayload(raw: unknown): ClinicDashboardStats {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid dashboard response.');
  }
  const d = raw as Record<string, unknown>;
  const visits = (d.visits as Record<string, unknown>) ?? {};
  const claims = (d.claims as Record<string, unknown>) ?? {};
  const appointments = (d.appointments as Record<string, unknown>) ?? {};
  const setup = (d.setup as Record<string, unknown>) ?? {};

  return {
    visits: {
      today: asCount(visits.today),
      open: asCount(visits.open),
      this_month: asCount(visits.this_month),
    },
    claims: {
      pending: asCount(claims.pending),
      approved: asCount(claims.approved),
      settled: asCount(claims.settled),
      this_month: asCount(claims.this_month),
      total_approved_amount: asMoneyString(claims.total_approved_amount),
    },
    appointments: {
      today: asCount(appointments.today),
      pending: asCount(appointments.pending),
      confirmed_today: asCount(appointments.confirmed_today),
    },
    setup: {
      is_complete: setup.is_complete === true,
    },
  };
}

function dashboardErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
    if (err.response?.status === 401) return 'Please sign in again.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not load dashboard statistics.';
}

/** GET /clinic/dashboard — visits, claims, appointments, setup flags. */
export async function fetchClinicDashboard(): Promise<ClinicDashboardStats> {
  try {
    const { data } = await api.get<ClinicDashboardEnvelope>('/clinic/dashboard');
    if (!data.success || !data.data) {
      throw new Error(data.message ?? 'Could not load dashboard statistics.');
    }
    return parseDashboardPayload(data.data);
  } catch (err) {
    throw new Error(dashboardErrorMessage(err));
  }
}

/** Format approved amount for dashboard cards (en-IN grouping). */
export function formatDashboardRupee(amount: string): string {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
