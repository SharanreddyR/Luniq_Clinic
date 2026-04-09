import { api } from '@/services/api';

export type OpdVisitPayload = {
  slipNumber: string;
  doctorId: number;
  doctorName: string;
  /** Optional link to patient record */
  patientCardNumber?: string;
};

export type OpdVisitResponse = {
  id: number;
  slipNumber: string;
  doctorId: number;
  doctorName: string;
  message?: string;
};

export const OPD_DOCTORS = [
  { id: 1, name: 'Dr. Priya Sharma' },
  { id: 2, name: 'Dr. James Chen' },
  { id: 3, name: 'Dr. Maria Garcia' },
] as const;

export function generateSlipNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = String(Math.floor(1000 + Math.random() * 9000));
  return `OPD-${y}${m}${day}-${r}`;
}

/**
 * Register OPD visit — POST /opd
 */
export async function saveOpdVisit(
  payload: OpdVisitPayload,
): Promise<OpdVisitResponse> {
  try {
    const { data } = await api.post<OpdVisitResponse>('/opd', {
      ...payload,
      registeredAt: new Date().toISOString(),
    });
    return data;
  } catch {
    await delay(650);
    if (!payload.slipNumber?.trim()) {
      throw new Error('Generate a slip first.');
    }
    if (!payload.doctorId || !payload.doctorName?.trim()) {
      throw new Error('Assign a doctor.');
    }
    return {
      id: Math.floor(10000 + Math.random() * 90000),
      slipNumber: payload.slipNumber,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      message: 'Visit saved (demo)',
    };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
