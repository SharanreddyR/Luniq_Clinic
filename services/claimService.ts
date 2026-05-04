import type { DocumentPickerAsset } from 'expo-document-picker';
import { isAxiosError } from 'axios';

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

// --- Clinic claims (GET /clinic/claims, GET /clinic/claims/{id}) ---

export type ClinicClaimListItem = {
  id: number;
  claim_number: string;
  patient_name: string;
  patient_gender: string;
  doctor_name: string;
  visited_at: string | null;
  total_claimed: string;
  approved_amount: string;
  status: string;
  raised_on: string;
};

export type ClinicClaimsListMeta = {
  current_page: number;
  last_page: number;
  total: number;
  has_more: boolean;
};

export type ClinicClaimsPage = {
  items: ClinicClaimListItem[];
  meta: ClinicClaimsListMeta;
};

export type ClinicClaimDetailServiceRow = {
  service_name: string;
  doctor: string | null;
  claimed_amount: string | null;
  approved_amount: string | null;
  reason: string | null;
};

export type ClinicClaimDetailDocument = {
  id: number;
  type: string;
  file_name: string;
  url: string;
};

export type ClinicClaimDetail = {
  id: number;
  claim_number: string;
  status: string;
  raised_on: string;
  reviewed_at: string | null;
  settled_at: string | null;
  rejection_reason: string | null;
  patient: { name: string; age: number | null; gender: string | null };
  visit: {
    visited_at: string;
    doctor: string;
    specialization: string;
    concession_applied: boolean | null;
    concession_amount: string | number | null;
  };
  financials: {
    total_claimed: string | number;
    approved_amount: string | number;
    difference: number | string | null;
  };
  services: ClinicClaimDetailServiceRow[];
  documents: ClinicClaimDetailDocument[];
};

function clinicClaimsApiMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const raw = err.response?.data;
    if (raw && typeof raw === 'object') {
      const m = (raw as Record<string, unknown>).message;
      if (typeof m === 'string' && m.trim()) return m.trim();
      const errs = (raw as Record<string, unknown>).errors;
      if (errs && typeof errs === 'object') {
        const lines = Object.entries(errs as Record<string, unknown>).flatMap(
          ([k, v]) =>
            Array.isArray(v)
              ? v.map((x) => `${k}: ${String(x)}`)
              : [`${k}: ${String(v)}`],
        );
        if (lines.length) return lines.join('\n');
      }
    }
    const status = err.response?.status;
    const msg = typeof err.message === 'string' ? err.message.trim() : '';
    if (msg) return status ? `${msg} (${status})` : msg;
    return status ? `Request failed (${status})` : 'Request failed.';
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return 'Something went wrong.';
}

function parseMoney(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim() || '—';
}

function asStringNumberOrNull(v: unknown): string | number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' || typeof v === 'number') return v;
  return null;
}

function financialScalar(v: unknown): string | number {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' || typeof v === 'number') return v;
  return String(v);
}

function parseClaimListRow(raw: unknown): ClinicClaimListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    claim_number: String(o.claim_number ?? ''),
    patient_name: String(o.patient_name ?? ''),
    patient_gender: String(o.patient_gender ?? ''),
    doctor_name: String(o.doctor_name ?? ''),
    visited_at:
      o.visited_at == null || o.visited_at === ''
        ? null
        : String(o.visited_at),
    total_claimed: parseMoney(o.total_claimed),
    approved_amount: parseMoney(o.approved_amount),
    status: String(o.status ?? ''),
    raised_on: String(o.raised_on ?? ''),
  };
}

function parseClaimsMeta(raw: unknown, fallbackTotal: number): ClinicClaimsListMeta {
  if (!raw || typeof raw !== 'object') {
    return {
      current_page: 1,
      last_page: 1,
      total: fallbackTotal,
      has_more: false,
    };
  }
  const m = raw as Record<string, unknown>;
  const totalNum = Number(m.total);
  return {
    current_page: Number(m.current_page) || 1,
    last_page: Number(m.last_page) || 1,
    total: Number.isFinite(totalNum) ? totalNum : fallbackTotal,
    has_more: Boolean(m.has_more),
  };
}

/**
 * GET /clinic/claims?page=&per_page=
 */
export async function fetchClinicClaimsPage(
  page: number,
  perPage = 15,
): Promise<ClinicClaimsPage> {
  try {
    const { data } = await api.get<unknown>('/clinic/claims', {
      params: { page, per_page: perPage },
    });
    if (!data || typeof data !== 'object') {
      return {
        items: [],
        meta: parseClaimsMeta(null, 0),
      };
    }
    const b = data as Record<string, unknown>;
    if (b.success === false) {
      const msg =
        typeof b.message === 'string' && b.message.trim()
          ? b.message.trim()
          : 'Could not load claims.';
      throw new Error(msg);
    }
    const rawItems = Array.isArray(b.data) ? b.data : [];
    const items = rawItems
      .map(parseClaimListRow)
      .filter((x): x is ClinicClaimListItem => x != null);
    const meta = parseClaimsMeta(b.meta, items.length);
    return { items, meta };
  } catch (err) {
    throw new Error(clinicClaimsApiMessage(err));
  }
}

function parseDetailServices(raw: unknown): ClinicClaimDetailServiceRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ClinicClaimDetailServiceRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    out.push({
      service_name: String(r.service_name ?? ''),
      doctor:
        r.doctor == null || r.doctor === ''
          ? null
          : String(r.doctor),
      claimed_amount:
        r.claimed_amount == null ? null : parseMoney(r.claimed_amount),
      approved_amount:
        r.approved_amount == null ? null : parseMoney(r.approved_amount),
      reason:
        r.reason == null || r.reason === ''
          ? null
          : String(r.reason),
    });
  }
  return out;
}

function parseDetailDocuments(raw: unknown): ClinicClaimDetailDocument[] {
  if (!Array.isArray(raw)) return [];
  const out: ClinicClaimDetailDocument[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.id);
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      type: String(r.type ?? ''),
      file_name: String(r.file_name ?? ''),
      url: String(r.url ?? ''),
    });
  }
  return out;
}

/**
 * GET /clinic/claims/{id}
 */
export async function fetchClinicClaimDetail(
  claimId: number,
): Promise<ClinicClaimDetail> {
  if (!Number.isFinite(claimId) || claimId <= 0) {
    throw new Error('Invalid claim.');
  }
  try {
    const { data } = await api.get<unknown>(`/clinic/claims/${claimId}`);
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response.');
    }
    const b = data as Record<string, unknown>;
    if (b.success === false) {
      const msg =
        typeof b.message === 'string' && b.message.trim()
          ? b.message.trim()
          : 'Could not load claim.';
      throw new Error(msg);
    }
    const d = b.data;
    if (!d || typeof d !== 'object') {
      throw new Error('Claim not found.');
    }
    const o = d as Record<string, unknown>;
    const id = Number(o.id);
    if (!Number.isFinite(id)) {
      throw new Error('Claim not found.');
    }

    const patientRaw = o.patient;
    const patient =
      patientRaw && typeof patientRaw === 'object'
        ? (patientRaw as Record<string, unknown>)
        : {};
    const visitRaw = o.visit;
    const visit =
      visitRaw && typeof visitRaw === 'object'
        ? (visitRaw as Record<string, unknown>)
        : {};
    const finRaw = o.financials;
    const fin =
      finRaw && typeof finRaw === 'object'
        ? (finRaw as Record<string, unknown>)
        : {};

    return {
      id,
      claim_number: String(o.claim_number ?? ''),
      status: String(o.status ?? ''),
      raised_on: String(o.raised_on ?? ''),
      reviewed_at:
        o.reviewed_at == null || o.reviewed_at === ''
          ? null
          : String(o.reviewed_at),
      settled_at:
        o.settled_at == null || o.settled_at === ''
          ? null
          : String(o.settled_at),
      rejection_reason:
        o.rejection_reason == null || o.rejection_reason === ''
          ? null
          : String(o.rejection_reason),
      patient: {
        name: String(patient.name ?? ''),
        age:
          patient.age == null || patient.age === ''
            ? null
            : Number(patient.age),
        gender:
          patient.gender == null ? null : String(patient.gender),
      },
      visit: {
        visited_at: String(visit.visited_at ?? ''),
        doctor: String(visit.doctor ?? '—'),
        specialization: String(visit.specialization ?? '—'),
        concession_applied:
          typeof visit.concession_applied === 'boolean'
            ? visit.concession_applied
            : null,
        concession_amount: asStringNumberOrNull(visit.concession_amount),
      },
      financials: {
        total_claimed: financialScalar(fin.total_claimed),
        approved_amount: financialScalar(fin.approved_amount),
        difference:
          fin.difference === undefined || fin.difference === null
            ? null
            : typeof fin.difference === 'number'
              ? fin.difference
              : Number(fin.difference),
      },
      services: parseDetailServices(o.services),
      documents: parseDetailDocuments(o.documents),
    };
  } catch (err) {
    if (err instanceof Error && !isAxiosError(err)) {
      throw err;
    }
    throw new Error(clinicClaimsApiMessage(err));
  }
}
