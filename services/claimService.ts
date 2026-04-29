import type { DocumentPickerAsset } from 'expo-document-picker';

import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import { appendPickerAssetToFormData } from '@/services/uploadService';
import { useAuthStore } from '@/store';

/** Shown after a successful claim submission */
export const CLAIM_POST_VERIFICATION_MESSAGE =
  'Submitted. Admin e-mail approval and background verification usually take about 10–15 minutes at the lead. You will receive updates on this claim ID.';

/** @deprecated Prefer {@link CLAIM_POST_VERIFICATION_MESSAGE} */
export const CLAIM_VERIFICATION_TAT = CLAIM_POST_VERIFICATION_MESSAGE;

/** Shown on claim status when lifecycle is approved */
export const CLAIM_APPROVED_DELIVERY_NOTE =
  'Approved. A formal approval summary is sent to the patient and to the clinic (per insurer / clinic policy).';

export type ClaimPatientOption = {
  id: number;
  name: string;
  cardNumber: string;
};

/** Demo roster for “Select patient”; active patient from lookup is merged in the screen */
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

/**
 * Submit insurance claim — POST /claim (multipart: patient fields + optional files).
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
      : '';
  if (!claimId) {
    throw new Error('Claim response missing claim ID.');
  }
  return {
    claimId,
    status: data.status ?? 'submitted',
    message: data.message,
  };
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
  'Lead review and background verification typically take about 10–15 minutes after admin approval. Our team may contact the patient if needed.';

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

  const { data } = await api.get<ClaimStatusResponse>('/claim-status', {
    params: { claimId: id },
  });
  return withLifecycle(data, id);
}
