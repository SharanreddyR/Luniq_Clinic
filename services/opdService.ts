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
  const { data } = await api.post<OpdSlipResponse>('/opd', {
    ...payload,
    submittedAt: new Date().toISOString(),
  });
  return data;
}
