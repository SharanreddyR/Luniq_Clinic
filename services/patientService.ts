import { api } from '@/services/http';
import type {
  PatientCardType,
  PatientMember,
  PatientRecord,
} from '@/types/patient';

export type { PatientRecord, PatientMember, PatientCardType } from '@/types/patient';

const MOCK_BASE: Omit<PatientRecord, 'cardNumber' | 'cardType' | 'members'> = {
  id: 101,
  name: 'Rahul Kumar',
  photo: 'https://via.placeholder.com/150',
};

function sampleMembers(cardType: PatientCardType): PatientMember[] {
  if (cardType === 'Family') {
    return [
      {
        name: 'Priya Kumar',
        photo: `https://via.placeholder.com/150/2ebdb4/ffffff?text=P1`,
        mobile: '+91 98765 11101',
      },
      {
        name: 'Aarav Kumar',
        photo: `https://via.placeholder.com/150/062d2f/ffffff?text=P2`,
        mobile: '+91 98765 11102',
      },
      {
        name: 'Ananya Kumar',
        photo: `https://via.placeholder.com/150/5a726f/ffffff?text=P3`,
        mobile: '+91 98765 11103',
      },
    ];
  }
  if (cardType === 'Couple') {
    return [
      {
        name: 'Sneha Kumar',
        photo: `https://via.placeholder.com/150/2ebdb4/ffffff?text=C1`,
        mobile: '+91 98765 22201',
      },
      {
        name: 'Rahul Kumar',
        photo: `https://via.placeholder.com/150/062d2f/ffffff?text=C2`,
        mobile: '+91 98765 22202',
      },
    ];
  }
  // Child plan — linked children / dependents
  return [
    {
      name: 'Riya Kumar',
      photo: `https://via.placeholder.com/150/2ebdb4/ffffff?text=CH1`,
      mobile: '+91 98765 33301',
    },
    {
      name: 'Vihaan Kumar',
      photo: `https://via.placeholder.com/150/062d2f/ffffff?text=CH2`,
      mobile: '+91 98765 33302',
    },
  ];
}

function resolveCardType(cardNumber: string): PatientCardType {
  const u = cardNumber.toUpperCase();
  if (u.includes('FAMILY')) return 'Family';
  if (u.includes('COUPLE')) return 'Couple';
  if (u.includes('CHILD')) return 'Child';
  return 'Individual';
}

/** Demo GET response — use card number hints: FAMILY, COUPLE, CHILD in the string */
export function mockPatientRecord(cardNumber: string): PatientRecord {
  const trimmed = cardNumber.trim();
  const upper = trimmed.toUpperCase();
  const cardType = resolveCardType(upper);
  const displayCard = trimmed ? upper : 'LQ12345';

  if (cardType === 'Individual') {
    return {
      ...MOCK_BASE,
      cardNumber: displayCard,
      mobile: '+91 98765 43210',
      cardType: 'Individual',
      members: [],
    };
  }

  return {
    ...MOCK_BASE,
    cardNumber: displayCard,
    mobile: '+91 98765 43210',
    cardType,
    members: sampleMembers(cardType),
  };
}

export async function fetchPatientByCardNumber(
  cardNumber: string,
): Promise<PatientRecord> {
  const trimmed = cardNumber.trim();
  if (!trimmed) {
    throw new Error('Enter a card number.');
  }

  const path = `/patient/${encodeURIComponent(trimmed)}`;

  try {
    const { data } = await api.get<PatientRecord & { photoUrl?: string }>(path);
    if (data == null || typeof data.id !== 'number' || !data.name || !data.cardNumber) {
      throw new Error('Invalid patient response.');
    }
    const photo = data.photo ?? data.photoUrl;
    if (!photo) {
      throw new Error('Invalid patient response.');
    }
    return {
      ...data,
      photo,
    };
  } catch {
    await delay(550);
    return mockPatientRecord(trimmed);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
