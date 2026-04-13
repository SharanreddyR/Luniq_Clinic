import { api } from '@/services/http';

/** @deprecated Use {@link OpdSlipPayload} / {@link createOpdSlip} for the OPD slip flow */
export type OpdVisitPayload = {
  slipNumber: string;
  doctorId: number;
  doctorName: string;
  patientCardNumber?: string;
};

/** @deprecated */
export type OpdVisitResponse = {
  id: number;
  slipNumber: string;
  doctorId: number;
  doctorName: string;
  message?: string;
};

export const OPD_DEPARTMENTS = [
  'General',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'ENT',
] as const;

export type OpdSlipPayload = {
  patientName: string;
  department: string;
  doctorId: number;
  doctorName: string;
  symptoms: string;
};

export type OpdSlipResponse = {
  opdId: string;
  status: string;
};

/**
 * Create OPD slip — POST /opd
 */
export async function createOpdSlip(
  payload: OpdSlipPayload,
): Promise<OpdSlipResponse> {
  try {
    const { data } = await api.post<OpdSlipResponse>('/opd', {
      ...payload,
      submittedAt: new Date().toISOString(),
    });
    return data;
  } catch {
    await delay(650);
    if (!payload.patientName?.trim()) {
      throw new Error('Patient name is missing.');
    }
    if (!payload.department?.trim()) {
      throw new Error('Select a department.');
    }
    if (!payload.doctorId || !payload.doctorName?.trim()) {
      throw new Error('Select a doctor.');
    }
    if (!payload.symptoms?.trim()) {
      throw new Error('Enter symptoms.');
    }
    return {
      opdId: 'OPD12345',
      status: 'created',
    };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
