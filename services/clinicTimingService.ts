import { api } from '@/services/http';

export type ClinicTimingPayload = {
  openTime: string;
  closeTime: string;
  /** When true, clinic is open for visits */
  isOpen: boolean;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /clinic-timing — persist hours and open/closed flag on the server.
 * Mock: resolves after a short delay when the request fails.
 */
export async function saveClinicTiming(
  payload: ClinicTimingPayload,
): Promise<void> {
  try {
    await api.post('/clinic-timing', {
      ...payload,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    await delay(450);
  }
}
