import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import { useAuthStore } from '@/store';

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
  /** Staff personal photo (users.profile). */
  profilePhotoUrl: string;
  /** Clinic branding (clinic_profiles.logo). */
  logoUrl: string;
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

  const userProfile =
    root.profile && typeof root.profile === 'object'
      ? (root.profile as Record<string, unknown>)
      : null;

  const clinicName = pickFirst(profileObj, ['clinic_name', 'clinicName', 'name']);
  const contactName = pickFirst(root, ['name', 'contact_name', 'contactName']);
  const phone = pickFirst(root, ['phone', 'mobile']);
  const email = pickFirst(root, ['email']);
  const address = pickFirst(profileObj, ['address']);
  const city = pickFirst(profileObj, ['city']);
  const state = pickFirst(profileObj, ['state']);
  const pincode = pickFirst(profileObj, ['pincode', 'zip']);
  const licenseNumber = pickFirst(profileObj, ['license_number', 'licenseNumber']);
  const logoUrl = pickFirst(profileObj, ['logo_url', 'logoUrl']);
  const profilePhotoUrl = userProfile
    ? pickFirst(userProfile, ['photo_url', 'photoUrl'])
    : '';

  if (
    !clinicName &&
    !contactName &&
    !phone &&
    !email &&
    !logoUrl &&
    !profilePhotoUrl
  ) {
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
    logoUrl,
    profilePhotoUrl,
  };
}

type UploadImageEnvelope = {
  success: boolean;
  message?: string;
  data?: { path?: string; url?: string };
};

export type ProfileImageUploadType = 'profile' | 'clinic_logo';

function guessMimeTypeFromUri(uri: string): string {
  const u = uri.toLowerCase();
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function filenameFromUri(uri: string, prefix: string): string {
  const fromPath = uri.split('/').pop()?.split('?')[0]?.trim();
  if (fromPath) return fromPath;
  return `${prefix}-${Date.now()}.jpg`;
}

function isLocalImageUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

function imageUploadUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/upload/image`;
}

/**
 * POST /upload/image — multipart `image` + form field `type`:
 * `profile` → users/{id}/profile; `clinic_logo` → clinics/{id}/logo
 *
 * Uses `fetch` instead of Axios on native: Axios + FormData often surfaces as
 * `ERR_NETWORK` on Android even when the API is reachable.
 */
export async function uploadImageToR2(
  uri: string,
  uploadType: ProfileImageUploadType,
  meta?: { name?: string | null; mimeType?: string | null },
): Promise<{ path: string; url: string }> {
  const clean = String(uri ?? '').trim();
  if (!clean || !isLocalImageUri(clean)) {
    throw new Error('Image is not a valid local file.');
  }

  const mime =
    (meta?.mimeType && String(meta.mimeType).trim()) || guessMimeTypeFromUri(clean);
  const name =
    (meta?.name && String(meta.name).trim()) ||
    filenameFromUri(clean, uploadType === 'profile' ? 'profile' : 'clinic-logo');

  const form = new FormData();
  form.append('type', uploadType);
  form.append(
    'image',
    {
      uri: clean,
      type: mime,
      name,
    } as unknown as Blob,
  );

  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(imageUploadUrl(), {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'Upload timed out.' : '';
    throw new Error(
      msg ||
        (e instanceof Error && e.message.trim()
          ? e.message.trim()
          : 'Network error during upload.'),
    );
  } finally {
    clearTimeout(timer);
  }

  const rawText = await res.text();
  let data: UploadImageEnvelope;
  try {
    data = JSON.parse(rawText) as UploadImageEnvelope;
  } catch {
    throw new Error(
      res.ok
        ? 'Invalid response from server.'
        : `Upload failed (${res.status}). ${rawText.slice(0, 120)}`,
    );
  }

  if (!res.ok) {
    throw new Error(data.message?.trim() || `Upload failed (${res.status}).`);
  }

  const path = data.data?.path?.trim();
  const url = data.data?.url?.trim();
  if (!data.success || !path || !url) {
    throw new Error(data.message?.trim() || 'Image upload failed.');
  }
  return { path, url };
}

/** PUT /profile — clinic staff personal photo (requires type=profile upload path). */
export async function updateProfilePhoto(profilePhotoPath: string): Promise<void> {
  const path = String(profilePhotoPath ?? '').trim();
  if (!path) {
    throw new Error('Missing profile photo path.');
  }
  await api.put('/profile', { profile_photo: path });
}

/** PUT /clinic/profile — clinic logo only (requires type=clinic_logo upload path). */
export async function updateClinicProfileLogo(logoPath: string): Promise<void> {
  const path = String(logoPath ?? '').trim();
  if (!path) {
    throw new Error('Missing logo path.');
  }
  await api.put('/clinic/profile', { logo: path });
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
