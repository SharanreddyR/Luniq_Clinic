import type { DocumentPickerAsset } from 'expo-document-picker';
import { isAxiosError } from 'axios';

import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import { appendPickerAssetToFormData } from '@/services/uploadService';

export type ClinicApplicationFormFields = {
  clinic_name: string;
  owner_name: string;
  /** Normalized digits-only phone */
  phone: string;
  email?: string;
  license_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type ClinicApplicationSubmitted = {
  id: number;
  clinic_name: string;
  status: string;
  submitted_at: string;
};

function formatLaravelErrors(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }
  const b = body as { errors?: Record<string, string[]>; message?: string };
  if (b.errors && typeof b.errors === 'object') {
    const lines = Object.entries(b.errors).flatMap(([key, msgs]) =>
      (Array.isArray(msgs) ? msgs : []).map(
        (m) => `${key.replace(/_/g, ' ')}: ${m}`,
      ),
    );
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }
  if (typeof b.message === 'string' && b.message.trim()) {
    return b.message.trim();
  }
  return '';
}

function apiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const fromBody = formatLaravelErrors(err.response?.data);
    if (fromBody) return fromBody;
    return err.message || 'Request failed.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

/**
 * RN DocumentPicker often omits mime or sends `application/octet-stream`;
 * Laravel `mimes:jpg,jpeg,png,pdf` uses the declared type / extension.
 */
function normalizePickerAssetForUpload(
  asset: DocumentPickerAsset,
): DocumentPickerAsset {
  const rawName = (asset.name ?? 'license').trim() || 'license';
  let name = rawName;
  if (!/\.(jpe?g|png|pdf)$/i.test(name)) {
    const ext = guessExtFromMime(asset.mimeType);
    name = `${name}.${ext}`;
  }

  let mimeType = asset.mimeType?.trim();
  if (!mimeType || mimeType === 'application/octet-stream') {
    mimeType = mimeFromFilename(name);
  }
  if (mimeType === 'image/jpg') {
    mimeType = 'image/jpeg';
  }

  return { ...asset, name, mimeType };
}

function guessExtFromMime(mime: string | null | undefined): string {
  if (!mime) return 'jpg';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  return 'jpg';
}

function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

/**
 * POST /clinic-application/upload-document — public multipart `document`.
 * Uses `fetch` (not Axios): RN + Axios + FormData often yields "Network Error"
 * even when `Content-Type` is cleared; `uploadService` uses the same pattern.
 */
export async function uploadApplicationLicense(
  asset: DocumentPickerAsset,
): Promise<string> {
  const formData = new FormData();
  appendPickerAssetToFormData(
    formData,
    'document',
    normalizePickerAssetForUpload(asset),
  );

  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/clinic-application/upload-document`;

  const controller = new AbortController();
  const timeoutMs = 90_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
      signal: controller.signal,
    });

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      const fromLaravel = formatLaravelErrors(body);
      const topMessage =
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message.trim()
          : '';
      const msg =
        fromLaravel ||
        topMessage ||
        `Upload failed (HTTP ${res.status}).`;
      throw new Error(msg);
    }

    const data = body as {
      success?: boolean;
      message?: string;
      data?: { path: string };
    };
    if (!data?.success || !data.data?.path) {
      throw new Error(data?.message || 'Document upload failed.');
    }
    return data.data.path;
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') {
      throw new Error(
        `Upload timed out after ${Math.round(timeoutMs / 1000)}s. Try a smaller file or check your connection.`,
      );
    }
    if (err instanceof Error && err.message) {
      throw err;
    }
    throw new Error(
      'Could not reach the server. Check your internet connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /clinic-application — public JSON body (see `ClinicApplicationRequest`).
 */
export async function submitClinicApplication(
  fields: ClinicApplicationFormFields & { license_document?: string },
): Promise<ClinicApplicationSubmitted> {
  const body: Record<string, string> = {
    clinic_name: fields.clinic_name.trim(),
    owner_name: fields.owner_name.trim(),
    phone: fields.phone.trim(),
    license_number: fields.license_number.trim(),
    address: fields.address.trim(),
    city: fields.city.trim(),
    state: fields.state.trim(),
    pincode: fields.pincode.trim(),
  };

  const email = fields.email?.trim();
  if (email) {
    body.email = email;
  }

  if (fields.license_document?.trim()) {
    body.license_document = fields.license_document.trim();
  }

  try {
    const { data } = await api.post<{
      success: boolean;
      message?: string;
      data?: ClinicApplicationSubmitted;
    }>('/clinic-application', body);

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Submission failed.');
    }
    return data.data;
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }
}

export async function submitApplicationWithOptionalDocument(
  fields: ClinicApplicationFormFields,
  licenseAsset: DocumentPickerAsset | null,
): Promise<ClinicApplicationSubmitted> {
  let license_document: string | undefined;
  if (licenseAsset) {
    license_document = await uploadApplicationLicense(licenseAsset);
  }
  return submitClinicApplication({
    ...fields,
    license_document,
  });
}
