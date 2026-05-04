import type { DocumentPickerAsset } from 'expo-document-picker';
import { isAxiosError } from 'axios';

import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import { appendPickerAssetToFormData } from '@/services/uploadService';
import { useAuthStore } from '@/store';

export type VisitDocumentType =
  | 'prescription'
  | 'invoice'
  | 'report'
  | 'supporting';

export type StartVisitPayload = {
  healthCardId: number;
  personId: number;
  doctorId: number;
};

export type SubmitVisitServiceLine = {
  service_name: string;
  amount: number;
  is_consultation?: boolean;
  is_referral?: boolean;
  doctor_id?: number | null;
  clinic_service_id?: number | null;
};

/** Row from GET /clinic/services */
export type ClinicVisitCatalogItem = {
  id: number;
  treatment_category_id?: number;
  name: string;
  slug: string | null;
  icon?: string | null;
  price: number;
};

export function parseClinicVisitCatalogItems(
  raw: unknown[],
): ClinicVisitCatalogItem[] {
  const out: ClinicVisitCatalogItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = Number(o.id);
    if (!Number.isFinite(id)) continue;
    const name = typeof o.name === 'string' ? o.name : String(o.name ?? '');
    const slug = typeof o.slug === 'string' ? o.slug.trim() : null;
    const price = Number(o.price);
    const tc =
      o.treatment_category_id != null
        ? Number(o.treatment_category_id)
        : undefined;
    const icon = typeof o.icon === 'string' ? o.icon : null;
    out.push({
      id,
      name,
      slug: slug || null,
      icon,
      price: Number.isFinite(price) ? price : 0,
      treatment_category_id:
        tc != null && Number.isFinite(tc) ? tc : undefined,
    });
  }
  return out;
}

export function isConsultationCatalogItem(
  row: Pick<ClinicVisitCatalogItem, 'slug' | 'name'>,
): boolean {
  const s = row.slug?.trim().toLowerCase();
  if (s === 'consultation') return true;
  return row.name.trim().toLowerCase() === 'consultation';
}

/**
 * Build POST /clinic/visits/{id}/submit `services` array from clinic catalogue.
 * Consultation amount is still sent (backend uses doctor / clinic fee when is_consultation).
 */
export type BuildSubmitLinesOptions = {
  /** Omit `clinic_service_id` (e.g. mock catalogue IDs are not real DB rows). */
  omitClinicServiceIds?: boolean;
};

export function buildSubmitLinesFromCatalog(
  orderedClinicServiceIds: number[],
  amounts: Record<number, string>,
  catalog: ClinicVisitCatalogItem[],
  doctorId: number,
  options?: BuildSubmitLinesOptions,
): SubmitVisitServiceLine[] {
  const omitIds = options?.omitClinicServiceIds === true;
  const byId = new Map(catalog.map((item) => [item.id, item]));
  return orderedClinicServiceIds.map((clinicServiceId) => {
    const row = byId.get(clinicServiceId);
    if (!row) {
      throw new Error(`Unknown clinic service id ${clinicServiceId}.`);
    }
    const isConsultation = isConsultationCatalogItem(row);
    const rawAmount =
      amounts[clinicServiceId] ??
      (row.price != null ? String(row.price) : '0');
    const amount = Number.parseFloat(String(rawAmount)) || 0;
    const base: SubmitVisitServiceLine = {
      service_name: row.name,
      amount,
      is_consultation: isConsultation,
      is_referral: false,
      doctor_id: isConsultation ? doctorId : null,
    };
    if (!omitIds) {
      base.clinic_service_id = clinicServiceId;
    }
    return base;
  });
}

export function selectionKeysToServiceLabels(
  keys: string[],
  catalog: ClinicVisitCatalogItem[],
): string[] {
  const byId = new Map(catalog.map((s) => [s.id, s.name]));
  return keys.map((k) => {
    if (k.startsWith('c:')) {
      const id = Number(k.slice(2));
      return byId.get(id) ?? 'Service';
    }
    if (k.startsWith('l:')) return k.slice(2);
    return k;
  });
}

export type StartVisitResponse = {
  visit_id: number;
  person: Record<string, unknown>;
  doctor: Record<string, unknown>;
  concession: Record<string, unknown>;
  recent_history: unknown[];
};

export type SubmitVisitResponse = {
  claim_number: string;
  total_claimed: string | number;
  status: string;
  concession_applied: boolean;
  concession_amount: string | number | null;
};

export type UploadVisitDocumentResponse = {
  id: number;
  type: string;
  file_name: string;
};

export type MemberVisitHistoryMeta = {
  current_page: number;
  last_page: number;
  total: number;
  has_more: boolean;
};

/** Laravel validation / message JSON from fetch or Axios responses */
function formatJsonErrorBody(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as { errors?: Record<string, string[]>; message?: string };
  if (b.errors && typeof b.errors === 'object') {
    const lines = Object.entries(b.errors).flatMap(([key, msgs]) =>
      (Array.isArray(msgs) ? msgs : []).map(
        (m) => `${key.replace(/_/g, ' ')}: ${m}`,
      ),
    );
    if (lines.length > 0) return lines.join('\n');
  }
  if (typeof b.message === 'string' && b.message.trim()) {
    return b.message.trim();
  }
  return '';
}

function errMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    const detailed = formatJsonErrorBody(e.response?.data);
    if (detailed) return detailed;
  }
  return e instanceof Error ? e.message : fallback;
}

/**
 * Camera / picker assets sometimes confuse Laravel `mimes` unless name + type align.
 */
function normalizeVisitUploadAsset(asset: DocumentPickerAsset): DocumentPickerAsset {
  const rawName = (asset.name ?? 'document').trim() || 'document';
  let name = rawName;
  if (!/\.(jpe?g|png|pdf|webp|heic|heif)$/i.test(name)) {
    const mime = asset.mimeType?.toLowerCase() ?? '';
    const ext = mime.includes('pdf')
      ? 'pdf'
      : mime.includes('png')
        ? 'png'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('heif')
            ? 'heif'
            : mime.includes('heic')
              ? 'heic'
              : 'jpg';
    name = `${name}.${ext}`;
  }
  let mimeType = asset.mimeType?.trim();
  if (!mimeType || mimeType === 'application/octet-stream') {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (lower.endsWith('.png')) mimeType = 'image/png';
    else if (lower.endsWith('.webp')) mimeType = 'image/webp';
    else if (lower.endsWith('.heif')) mimeType = 'image/heif';
    else if (lower.endsWith('.heic')) mimeType = 'image/heic';
    else mimeType = 'image/jpeg';
  }
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  return { ...asset, name, mimeType };
}

/** POST /clinic/visits/start */
export async function startClinicVisit(
  payload: StartVisitPayload,
): Promise<StartVisitResponse> {
  try {
    const { data } = await api.post<{
      success?: boolean;
      data?: StartVisitResponse;
    }>('/clinic/visits/start', {
      health_card_id: payload.healthCardId,
      person_id: payload.personId,
      doctor_id: payload.doctorId,
    });
    const row = data?.data;
    if (!row?.visit_id) {
      throw new Error('Invalid start visit response.');
    }
    return row;
  } catch (e) {
    throw new Error(errMessage(e, 'Could not start visit.'));
  }
}

/**
 * POST /clinic/visits/{id}/documents (multipart).
 * Uses `fetch` instead of Axios: React Native + Axios + FormData often reports
 * "Network Error" even when the server is reachable (same pattern as `uploadService.uploadDocument`).
 */
export async function uploadClinicVisitDocument(
  visitId: number,
  file: { uri: string; name: string; type?: string },
  docType: VisitDocumentType,
): Promise<UploadVisitDocumentResponse> {
  const asset = normalizeVisitUploadAsset({
    uri: file.uri,
    name: file.name ?? 'upload',
    mimeType: file.type,
    lastModified: Date.now(),
  });

  const form = new FormData();
  appendPickerAssetToFormData(form, 'document', asset);
  form.append('type', docType);

  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/clinic/visits/${visitId}/documents`;

  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = 90_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    });

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore non-JSON */
    }

    if (!res.ok) {
      const fromBody = formatJsonErrorBody(body);
      throw new Error(
        fromBody || `Could not upload document (${res.status}).`,
      );
    }

    const payload = body as {
      success?: boolean;
      data?: UploadVisitDocumentResponse;
    };
    const row = payload?.data;
    if (!row?.id) {
      throw new Error('Invalid upload response.');
    }
    return row;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Upload timed out.');
    }
    if (e instanceof Error && e.message) {
      throw e;
    }
    throw new Error('Could not upload document.');
  } finally {
    clearTimeout(timer);
  }
}

/** POST /clinic/visits/{id}/submit */
export async function submitClinicVisit(
  visitId: number,
  services: SubmitVisitServiceLine[],
  applyConcession = false,
): Promise<SubmitVisitResponse> {
  try {
    const { data } = await api.post<{
      success?: boolean;
      data?: SubmitVisitResponse;
    }>(`/clinic/visits/${visitId}/submit`, {
      services,
      apply_concession: applyConcession,
    });
    const row = data?.data;
    if (!row?.claim_number) {
      throw new Error('Invalid submit visit response.');
    }
    return row;
  } catch (e) {
    throw new Error(errMessage(e, 'Could not submit visit.'));
  }
}

/** GET /clinic/visits/open — paginated open visits (default per_page=10) */
export type ClinicOpenVisitPatient = {
  id: number;
  name: string;
  gender: string;
  photo_url: string | null;
};

export type ClinicOpenVisitDoctor = {
  id: number;
  name: string;
  specialization: string | null;
};

export type ClinicOpenVisitRow = {
  visit_id: number;
  started_at: string;
  card_number: string;
  patient: ClinicOpenVisitPatient;
  doctor: ClinicOpenVisitDoctor;
  documents_uploaded: number;
};

function parseClinicOpenVisitRows(raw: unknown): ClinicOpenVisitRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ClinicOpenVisitRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const visitId = Number(o.visit_id);
    if (!Number.isFinite(visitId)) continue;
    const started_at =
      typeof o.started_at === 'string' ? o.started_at : '';
    const card_number =
      typeof o.card_number === 'string' ? o.card_number : '';
    const p = o.patient;
    const d = o.doctor;
    if (!p || typeof p !== 'object' || !d || typeof d !== 'object') continue;
    const pr = p as Record<string, unknown>;
    const dr = d as Record<string, unknown>;
    const pid = Number(pr.id);
    const did = Number(dr.id);
    if (!Number.isFinite(pid) || !Number.isFinite(did)) continue;
    const spec = dr.specialization;
    out.push({
      visit_id: visitId,
      started_at,
      card_number,
      patient: {
        id: pid,
        name: typeof pr.name === 'string' ? pr.name : String(pr.name ?? ''),
        gender: typeof pr.gender === 'string' ? pr.gender : '',
        photo_url:
          typeof pr.photo_url === 'string' ? pr.photo_url.trim() : null,
      },
      doctor: {
        id: did,
        name: typeof dr.name === 'string' ? dr.name : String(dr.name ?? ''),
        specialization:
          typeof spec === 'string' && spec.trim() ? spec.trim() : null,
      },
      documents_uploaded: Number(o.documents_uploaded) || 0,
    });
  }
  return out;
}

export type ClinicOpenVisitsMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function parseClinicOpenVisitsMeta(raw: unknown): ClinicOpenVisitsMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const current_page = Number(m.current_page);
  const last_page = Number(m.last_page);
  const per_page = Number(m.per_page);
  const total = Number(m.total);
  if (
    ![current_page, last_page, per_page, total].every((n) =>
      Number.isFinite(n),
    )
  ) {
    return null;
  }
  return { current_page, last_page, per_page, total };
}

export async function fetchClinicOpenVisitsPage(options: {
  page: number;
  perPage?: number;
}): Promise<{ data: ClinicOpenVisitRow[]; meta: ClinicOpenVisitsMeta }> {
  const perPage = options.perPage ?? 10;
  try {
    const { data } = await api.get<{
      success?: boolean;
      data?: unknown[];
      meta?: unknown;
    }>('/clinic/visits/open', {
      params: { page: options.page, per_page: perPage },
    });
    const rows = parseClinicOpenVisitRows(data?.data);
    const parsed = parseClinicOpenVisitsMeta(data?.meta);
    const meta: ClinicOpenVisitsMeta =
      parsed ??
      ({
        current_page: options.page,
        last_page: rows.length < perPage ? options.page : options.page + 1,
        per_page: perPage,
        total:
          rows.length < perPage
            ? (options.page - 1) * perPage + rows.length
            : options.page * perPage + 1,
      } as ClinicOpenVisitsMeta);
    return { data: rows, meta };
  } catch (e) {
    throw new Error(errMessage(e, 'Could not load open visits.'));
  }
}

export async function fetchMemberVisitHistory(
  personId: number,
  options?: { perPage?: number },
): Promise<{ items: unknown[]; meta: MemberVisitHistoryMeta }> {
  const perPage = options?.perPage ?? 10;
  try {
    const { data } = await api.get<{
      success?: boolean;
      data?: unknown[];
      meta?: MemberVisitHistoryMeta;
    }>(`/clinic/visits/member/${personId}/history`, {
      params: { per_page: perPage },
    });
    return {
      items: Array.isArray(data?.data) ? data.data : [],
      meta: data?.meta ?? {
        current_page: 1,
        last_page: 1,
        total: 0,
        has_more: false,
      },
    };
  } catch (e) {
    throw new Error(errMessage(e, 'Could not load visit history.'));
  }
}

/** GET /clinic/services — clinic service catalogue for visits */
export async function fetchClinicVisitServices(): Promise<unknown[]> {
  try {
    const { data } = await api.get<{ success?: boolean; data?: unknown[] }>(
      '/clinic/services',
    );
    return Array.isArray(data?.data) ? data.data : [];
  } catch (e) {
    throw new Error(errMessage(e, 'Could not load clinic services.'));
  }
}

export async function fetchClinicVisitServicesCatalog(): Promise<
  ClinicVisitCatalogItem[]
> {
  const raw = await fetchClinicVisitServices();
  return parseClinicVisitCatalogItems(raw);
}
