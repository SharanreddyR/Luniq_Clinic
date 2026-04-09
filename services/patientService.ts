import { api } from '@/services/api';

export type PatientDetails = {
  name: string;
  /** Remote image URL */
  photoUrl: string;
};

/** Mock when GET /patient/:cardNumber fails (no backend / offline demo). */
export function mockPatientDetails(cardNumber: string): PatientDetails {
  const safe = cardNumber.trim() || 'guest';
  return {
    name: 'Alex Morgan',
    photoUrl: `https://picsum.photos/seed/${encodeURIComponent(safe)}/400/400`,
  };
}

export async function fetchPatientByCardNumber(
  cardNumber: string,
): Promise<PatientDetails> {
  const trimmed = cardNumber.trim();
  if (!trimmed) {
    throw new Error('Enter a card number.');
  }

  const path = `/patient/${encodeURIComponent(trimmed)}`;

  try {
    const { data } = await api.get<PatientDetails>(path);
    if (!data?.name || !data?.photoUrl) {
      throw new Error('Invalid patient response.');
    }
    return data;
  } catch {
    await delay(550);
    return mockPatientDetails(trimmed);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
