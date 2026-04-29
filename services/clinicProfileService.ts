import { api } from '@/services/http';

export type ClinicProfileData = {
  clinicName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  licenseNumber: string;
};

const PROFILE_ENDPOINTS = [
  '/admin/clinic-profiles',
  '/clinic/profile',
  '/auth/me',
] as const;

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function pickFirst(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const value = text(obj[k]);
    if (value) return value;
  }
  return '';
}

function parseClinicProfile(raw: unknown): ClinicProfileData | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;

  if ('data' in root) return parseClinicProfile(root.data);
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const parsed = parseClinicProfile(item);
      if (parsed) return parsed;
    }
    return null;
  }

  const profileObj =
    root.clinic_profile && typeof root.clinic_profile === 'object'
      ? (root.clinic_profile as Record<string, unknown>)
      : root;

  const clinicName = pickFirst(profileObj, ['clinic_name', 'clinicName', 'name']);
  const contactName = pickFirst(root, ['name', 'contact_name', 'contactName']);
  const phone = pickFirst(root, ['phone', 'mobile']);
  const email = pickFirst(root, ['email']);
  const address = pickFirst(profileObj, ['address']);
  const city = pickFirst(profileObj, ['city']);
  const state = pickFirst(profileObj, ['state']);
  const pincode = pickFirst(profileObj, ['pincode', 'zip']);
  const licenseNumber = pickFirst(profileObj, ['license_number', 'licenseNumber']);

  if (!clinicName && !contactName && !phone && !email) {
    return null;
  }
  return {
    clinicName,
    contactName,
    phone,
    email,
    address,
    city,
    state,
    pincode,
    licenseNumber,
  };
}

export async function fetchClinicProfile(): Promise<ClinicProfileData | null> {
  for (const endpoint of PROFILE_ENDPOINTS) {
    try {
      const { data } = await api.get<unknown>(endpoint);
      const parsed = parseClinicProfile(data);
      if (parsed) return parsed;
    } catch {
      // Try next endpoint.
    }
  }
  return null;
}
