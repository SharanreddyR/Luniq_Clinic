import { isAxiosError } from 'axios';

import { api } from '@/services/http';

export type SetupServiceOption = {
  id: number;
  name: string;
  slug?: string | null;
  icon?: string | null;
  description?: string | null;
  /** Present when API marks a row already linked to this clinic */
  isMapped?: boolean;
};

export type AvailableServicesResult = {
  items: SetupServiceOption[];
  /** e.g. "Select services your clinic offers and set your price." */
  message: string | null;
};

/** Row from GET /clinic/setup/my-services (`data` array item). */
export type MyClinicServiceRow = {
  id: number;
  treatment_category_id: number;
  name: string;
  slug?: string | null;
  icon?: string | null;
  price: number;
};

function formatLaravelErrors(body: unknown): string {
  if (typeof body === 'string' && body.trim()) {
    const text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.slice(0, 400);
  }

  if (!body || typeof body !== 'object') {
    return '';
  }

  const b = body as Record<string, unknown>;

  if (typeof b.message === 'string' && b.message.trim()) {
    return b.message.trim();
  }

  if (typeof b.error === 'string' && b.error.trim()) {
    return b.error.trim();
  }

  const nestedData = b.data;
  if (nestedData && typeof nestedData === 'object') {
    const dm = (nestedData as Record<string, unknown>).message;
    if (typeof dm === 'string' && dm.trim()) {
      return dm.trim();
    }
  }

  const errs = b.errors;
  if (errs && typeof errs === 'object') {
    const lines = Object.entries(errs as Record<string, unknown>).flatMap(
      ([key, msgs]) => {
        if (Array.isArray(msgs)) {
          return msgs.map((m) =>
            typeof m === 'string'
              ? `${key.replace(/_/g, ' ')}: ${m}`
              : `${key.replace(/_/g, ' ')}: ${String(m)}`,
          );
        }
        if (typeof msgs === 'string') {
          return [`${key.replace(/_/g, ' ')}: ${msgs}`];
        }
        return [];
      },
    );
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }

  return '';
}

function apiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const statusText = err.response?.statusText?.trim();
    const raw = err.response?.data;

    const fromBody = formatLaravelErrors(raw);
    if (fromBody) return fromBody;

    const axiosMsg = typeof err.message === 'string' ? err.message.trim() : '';
    if (axiosMsg) {
      if (status != null) {
        const st = statusText ? `${status} ${statusText}` : String(status);
        return `${axiosMsg} (${st})`;
      }
      return axiosMsg;
    }

    if (status != null) {
      return statusText ? `${status} ${statusText}` : String(status);
    }

    return 'Request failed.';
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  return 'Something went wrong.';
}

function rowIsMapped(o: Record<string, unknown>): boolean {
  if (o.selected === true || o.is_mapped === true) return true;
  if (o.enabled_for_clinic === true || o.is_enabled === true) return true;
  const cid = o.clinic_service_id;
  if (typeof cid === 'number' && cid > 0) return true;
  return false;
}

function normalizeServiceRows(raw: unknown): SetupServiceOption[] {
  if (!Array.isArray(raw)) return [];
  const out: SetupServiceOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = Number(o.id ?? o.service_id);
    const name = String(o.name ?? o.title ?? o.label ?? '').trim();
    if (!Number.isFinite(id) || id <= 0 || !name) continue;
    const slug =
      typeof o.slug === 'string' && o.slug.trim() ? o.slug.trim() : null;
    const icon =
      typeof o.icon === 'string' && o.icon.trim()
        ? o.icon.trim()
        : o.icon === null
          ? null
          : null;
    const description =
      typeof o.description === 'string'
        ? o.description
        : typeof o.details === 'string'
          ? o.details
          : null;
    out.push({
      id,
      name,
      slug,
      icon,
      description,
      isMapped: rowIsMapped(o),
    });
  }
  return out;
}

/**
 * GET /clinic/setup/available-services
 * @example `{ success, message, data: [{ id, name, slug, icon }] }`
 */
export async function fetchClinicSetupAvailableServices(): Promise<AvailableServicesResult> {
  try {
    const { data } = await api.get<unknown>(
      '/clinic/setup/available-services',
    );
    if (!data || typeof data !== 'object') {
      return { items: [], message: null };
    }
    const b = data as Record<string, unknown>;
    const message =
      typeof b.message === 'string' && b.message.trim()
        ? b.message.trim()
        : null;
    const items = normalizeServiceRows(b.data);
    return { items, message };
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }
}

function normalizeMyServiceRows(raw: unknown): MyClinicServiceRow[] {
  if (!Array.isArray(raw)) return [];
  const out: MyClinicServiceRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    let treatment_category_id = Number(
      o.treatment_category_id ?? o.category_id ?? o.service_id,
    );
    if (
      (!Number.isFinite(treatment_category_id) || treatment_category_id <= 0) &&
      o.category &&
      typeof o.category === 'object'
    ) {
      const cat = o.category as Record<string, unknown>;
      treatment_category_id = Number(cat.id);
    }
    if (!Number.isFinite(treatment_category_id) || treatment_category_id <= 0) {
      continue;
    }
    const id = Number(o.id);
    const priceRaw = o.price;
    let price = 0;
    if (typeof priceRaw === 'number' && Number.isFinite(priceRaw)) {
      price = priceRaw;
    } else if (typeof priceRaw === 'string' && priceRaw.trim()) {
      const p = parseFloat(priceRaw.replace(',', '.'));
      price = Number.isFinite(p) ? p : 0;
    }
    const name = String(o.name ?? '').trim();
    const slug =
      typeof o.slug === 'string' && o.slug.trim() ? o.slug.trim() : null;
    const icon =
      typeof o.icon === 'string' && o.icon.trim()
        ? o.icon.trim()
        : o.icon === null
          ? null
          : null;
    out.push({
      id: Number.isFinite(id) && id > 0 ? id : 0,
      treatment_category_id,
      name,
      slug,
      icon,
      price,
    });
  }
  return out;
}

/**
 * GET /clinic/setup/my-services — clinic's current selections and prices.
 */
export async function fetchClinicSetupMyServices(): Promise<MyClinicServiceRow[]> {
  try {
    const { data } = await api.get<unknown>('/clinic/setup/my-services');
    if (!data || typeof data !== 'object') return [];
    const b = data as Record<string, unknown>;
    return normalizeMyServiceRows(b.data);
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }
}

export type SaveClinicSetupServicesPayload = {
  treatment_category_id: number;
  price: number;
};

/**
 * POST /clinic/setup/services — `{ services: [{ treatment_category_id, price }] }`
 */
export async function saveClinicSetupServices(
  services: SaveClinicSetupServicesPayload[],
): Promise<{ message?: string }> {
  const cleaned = services.filter(
    (s) =>
      typeof s.treatment_category_id === 'number' &&
      Number.isFinite(s.treatment_category_id) &&
      s.treatment_category_id > 0 &&
      typeof s.price === 'number' &&
      Number.isFinite(s.price) &&
      s.price >= 0,
  );
  if (cleaned.length === 0) {
    throw new Error('Select at least one service with a valid price (0 or more).');
  }

  try {
    const { data } = await api.post<{ success?: boolean; message?: string }>(
      '/clinic/setup/services',
      { services: cleaned },
    );
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      data.success === false
    ) {
      throw new Error(
        typeof data.message === 'string' && data.message.trim()
          ? data.message
          : 'Could not save services.',
      );
    }
    const message =
      data &&
      typeof data === 'object' &&
      typeof data.message === 'string' &&
      data.message.trim()
        ? data.message.trim()
        : undefined;
    return { message };
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }
}

