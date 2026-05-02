import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import { isAxiosError } from 'axios';
import type {
  PatientCardType,
  PatientMember,
  PatientRecord,
} from '@/types/patient';

export type { PatientRecord, PatientMember, PatientCardType } from '@/types/patient';

type ApiLookupMember = {
  id?: number;
  person_id?: number;
  unified_id?: string;
  name?: string;
  relation?: string;
  is_primary?: boolean;
  age?: number;
  gender?: string;
  photo?: string;
  photo_url?: string;
};

const PLACEHOLDER_PHOTO = 'https://via.placeholder.com/150';

/** Turn API `photo_url` / `photo` into a URI React Native `Image` can load. */
export function resolveMemberPhotoUri(photoUrl?: string, photo?: string): string {
  const pDirect = typeof photo === 'string' ? photo.trim() : '';
  if (/^https?:\/\//i.test(pDirect)) {
    return pDirect;
  }
  const candidates = [photoUrl, photo];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const s = raw.trim();
    if (!s) continue;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return `https:${s}`;
    if (s.startsWith('/')) {
      try {
        return `${new URL(API_BASE_URL).origin}${s}`;
      } catch {
        continue;
      }
    }
  }
  return PLACEHOLDER_PHOTO;
}

type ApiLookupData = {
  card_id?: number;
  card_number?: string;
  status?: string;
  is_valid?: boolean;
  purchased_at?: string;
  expires_at?: string;
  amount_paid?: string;
  card_type?: string;
  plan_type?: string;
  benefits?: string[];
  members?: ApiLookupMember[];
};

function mapLookupMember(m: ApiLookupMember): PatientMember | null {
  const name = typeof m.name === 'string' ? m.name.trim() : '';
  if (!name) return null;
  const photo = resolveMemberPhotoUri(m.photo_url, m.photo);
  return {
    id: typeof m.id === 'number' ? m.id : undefined,
    personId: typeof m.person_id === 'number' ? m.person_id : undefined,
    unifiedId: typeof m.unified_id === 'string' ? m.unified_id : undefined,
    name,
    photo,
    mobile:
      (typeof m.unified_id === 'string' && m.unified_id.trim()) ||
      (typeof m.relation === 'string' && m.relation.trim()) ||
      '—',
    relation: typeof m.relation === 'string' ? m.relation : undefined,
    isPrimary: typeof m.is_primary === 'boolean' ? m.is_primary : undefined,
    age: typeof m.age === 'number' ? m.age : null,
    gender: typeof m.gender === 'string' ? m.gender : null,
  };
}

function normalizeLookupResponse(data: ApiLookupData): PatientRecord {
  const members = Array.isArray(data.members)
    ? data.members
        .map(mapLookupMember)
        .filter((m): m is PatientMember => m != null)
    : [];

  const primary =
    members.find((m) => m.isPrimary) ??
    members[0];
  if (!primary) {
    throw new Error('Invalid patient response.');
  }

  return {
    id: primary.personId ?? primary.id ?? 0,
    healthCardId:
      typeof data.card_id === 'number' && Number.isFinite(data.card_id)
        ? data.card_id
        : undefined,
    name: primary.name,
    photo: primary.photo,
    cardNumber:
      typeof data.card_number === 'string' ? data.card_number : '',
    mobile: primary.mobile,
    cardType:
      typeof data.card_type === 'string' ? data.card_type : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
    isValid: typeof data.is_valid === 'boolean' ? data.is_valid : undefined,
    purchasedAt:
      typeof data.purchased_at === 'string' ? data.purchased_at : null,
    expiresAt:
      typeof data.expires_at === 'string' ? data.expires_at : null,
    amountPaid:
      typeof data.amount_paid === 'string' ? data.amount_paid : null,
    planType:
      typeof data.plan_type === 'string' ? data.plan_type : undefined,
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    members,
  };
}

export async function fetchPatientByCardNumber(
  cardNumber: string,
): Promise<PatientRecord> {
  const trimmed = cardNumber.trim();
  if (!trimmed) {
    throw new Error('Enter a card number.');
  }

  try {
    const { data } = await api.get<{ success?: boolean; data?: ApiLookupData }>(
      '/clinic/card/lookup',
      { params: { card_number: trimmed } },
    );
    if (!data?.success || !data.data) {
      throw new Error('Invalid patient response.');
    }
    const mapped = normalizeLookupResponse(data.data);
    if (!mapped.cardNumber || !mapped.id) {
      throw new Error('Invalid patient response.');
    }
    return mapped;
  } catch (err) {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const body = err.response?.data as
        | { message?: string; errors?: Record<string, string[]> }
        | undefined;
      if (status === 404) {
        throw new Error('Card not found.');
      }
      const first =
        body?.errors &&
        Object.values(body.errors).find((v) => Array.isArray(v) && v[0])?.[0];
      if (first) {
        throw new Error(first);
      }
      if (typeof body?.message === 'string' && body.message.trim()) {
        throw new Error(body.message.trim());
      }
      throw new Error(err.message || 'Could not load patient.');
    }
    throw err instanceof Error ? err : new Error('Could not load patient.');
  }
}
