import type { DocumentPickerAsset } from 'expo-document-picker';

import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import { appendPickerAssetToFormData } from '@/services/uploadService';
import { useAuthStore } from '@/store';

/** Shown after a successful claim submission */
export const CLAIM_POST_VERIFICATION_MESSAGE =
  'Claim under verification (3–4 hours)';

/** @deprecated Prefer {@link CLAIM_POST_VERIFICATION_MESSAGE} */
export const CLAIM_VERIFICATION_TAT = CLAIM_POST_VERIFICATION_MESSAGE;

export type ClaimPatientOption = {
  id: number;
  name: string;
  cardNumber: string;
};

/** Demo roster for “Select patient”; active patient from lookup is merged in the screen */
export const MOCK_SELECTABLE_CLAIM_PATIENTS: ClaimPatientOption[] = [
  { id: 201, name: 'Ravi Kumar', cardNumber: 'PC-88421' },
  { id: 202, name: 'Anita Desai', cardNumber: 'PC-90211' },
  { id: 203, name: 'Leo Martinez', cardNumber: 'PC-77102' },
];

export type ClaimSubmissionPayload = {
  patientId: number;
  patientName: string;
  patientCardNumber: string;
  prescription: DocumentPickerAsset | null;
  reports: DocumentPickerAsset | null;
  bills: DocumentPickerAsset | null;
};

export type ClaimSubmissionResponse = {
  claimId: string;
  status: string;
  message?: string;
};

function claimUploadUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/claim`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Submit insurance claim — POST /claim (multipart: patient fields + optional files).
 * Mock: `{ claimId: "CLM123", status: "submitted" }` when the request fails.
 */
export async function submitClaim(
  payload: ClaimSubmissionPayload,
): Promise<ClaimSubmissionResponse> {
  if (!Number.isFinite(payload.patientId)) {
    throw new Error('Select a patient.');
  }
  const hasDoc =
    payload.prescription != null ||
    payload.reports != null ||
    payload.bills != null;
  if (!hasDoc) {
    throw new Error('Attach at least one document (prescription, reports, or bills).');
  }

  const formData = new FormData();
  formData.append('patientId', String(payload.patientId));
  formData.append('patientName', payload.patientName);
  formData.append('patientCardNumber', payload.patientCardNumber);
  if (payload.prescription) {
    appendPickerAssetToFormData(
      formData,
      'prescription',
      payload.prescription,
    );
  }
  if (payload.reports) {
    appendPickerAssetToFormData(formData, 'reports', payload.reports);
  }
  if (payload.bills) {
    appendPickerAssetToFormData(formData, 'bills', payload.bills);
  }

  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(claimUploadUrl(), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Claim failed (${res.status})`);
    }

    const data = (await res.json()) as Partial<ClaimSubmissionResponse>;
    const claimId =
      data.claimId != null && String(data.claimId).length > 0
        ? String(data.claimId)
        : 'CLM123';
    return {
      claimId,
      status: data.status ?? 'submitted',
      message: data.message,
    };
  } catch {
    await delay(700);
    return {
      claimId: 'CLM123',
      status: 'submitted',
    };
  }
}

/** Canonical claim status for UI (matches GET /claim-status values we support). */
export type ClaimLifecycleStatus =
  | 'submitted'
  | 'verifying'
  | 'approved'
  | 'rejected';

export const CLAIM_LIFECYCLE_LABELS: Record<ClaimLifecycleStatus, string> = {
  submitted: 'Submitted',
  verifying: 'Verifying',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const CLAIM_STATUS_TRACKING_NOTE =
  'Verification takes 3–4 hours. Our team may call the patient.';

export type ClaimStatusResponse = {
  status: string;
  claimId?: string;
  message?: string;
  updatedAt?: string;
  /** Derived from {@link status} when the API omits a structured field */
  lifecycle?: ClaimLifecycleStatus;
};

export function normalizeClaimLifecycleStatus(
  raw: string | undefined | null,
): ClaimLifecycleStatus {
  const s = (raw ?? '').toLowerCase().trim();
  if (!s) return 'submitted';
  if (s.includes('reject') || s === 'rejected' || s === 'denied') {
    return 'rejected';
  }
  if (s.includes('approv') || s === 'approved' || s === 'paid') {
    return 'approved';
  }
  if (
    s.includes('verif') ||
    s.includes('review') ||
    s.includes('pending') ||
    s.includes('process') ||
    s.includes('queue')
  ) {
    return 'verifying';
  }
  if (s.includes('submit') || s === 'received' || s === 'filed') {
    return 'submitted';
  }
  return 'verifying';
}

function mockLifecycleFromClaimId(claimId: string): ClaimLifecycleStatus {
  const u = claimId.trim().toUpperCase();
  if (u.includes('REJ') || u.includes('DENY')) return 'rejected';
  if (u.includes('APR') || u.includes('OK') || u.endsWith('9')) {
    return 'approved';
  }
  if (u === 'CLM123' || u.includes('VER')) return 'verifying';
  return 'submitted';
}

function withLifecycle(
  data: ClaimStatusResponse,
  claimId: string | null,
): ClaimStatusResponse {
  const lifecycle =
    data.lifecycle ?? normalizeClaimLifecycleStatus(data.status);
  return {
    ...data,
    claimId: data.claimId ?? claimId ?? undefined,
    lifecycle,
    status: CLAIM_LIFECYCLE_LABELS[lifecycle],
  };
}

/**
 * GET /claim-status?claimId=…
 */
export async function fetchClaimStatus(
  claimId: string | null,
): Promise<ClaimStatusResponse> {
  if (!claimId?.trim()) {
    return withLifecycle(
      {
        status: CLAIM_LIFECYCLE_LABELS.submitted,
        message: 'Enter a claim ID to load status.',
      },
      null,
    );
  }

  const id = claimId.trim();

  try {
    const { data } = await api.get<ClaimStatusResponse>('/claim-status', {
      params: { claimId: id },
    });
    return withLifecycle(data, id);
  } catch {
    await delay(450);
    const lifecycle = mockLifecycleFromClaimId(id);
    return withLifecycle(
      {
        status: CLAIM_LIFECYCLE_LABELS[lifecycle],
        claimId: id,
        message:
          lifecycle === 'rejected'
            ? 'This claim was not approved under the current policy review.'
            : lifecycle === 'approved'
              ? 'Payment processing will follow insurer timelines.'
              : lifecycle === 'verifying'
                ? 'Documents are with the verification team.'
                : 'We have received your submission.',
      },
      id,
    );
  }
}
