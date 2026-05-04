import { api } from '@/services/http';

export type AppNotification = {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationsMeta = {
  current_page: number;
  last_page: number;
  has_more: boolean;
};

export type NotificationsListResponse = {
  success: boolean;
  unread_count: number;
  data: AppNotification[];
  meta: NotificationsMeta;
};

export async function fetchNotificationsPage(
  page: number,
  perPage = 20,
): Promise<NotificationsListResponse> {
  const { data } = await api.get<NotificationsListResponse>('/notifications', {
    params: { page, per_page: perPage },
  });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;
  return {
    success: Boolean(data?.success),
    unread_count: Number(data?.unread_count ?? 0) || 0,
    data: rows,
    meta: {
      current_page:
        meta != null && typeof meta === 'object' && 'current_page' in meta
          ? Number((meta as NotificationsMeta).current_page) || page
          : page,
      last_page:
        meta != null && typeof meta === 'object' && 'last_page' in meta
          ? Number((meta as NotificationsMeta).last_page) || page
          : page,
      has_more:
        meta != null &&
        typeof meta === 'object' &&
        'has_more' in meta &&
        Boolean((meta as NotificationsMeta).has_more),
    },
  };
}

/** Backend: PUT /notifications/{id}/read */
export async function markNotificationRead(id: number): Promise<void> {
  await api.put(`/notifications/${id}/read`, {});
}

/** Backend: PUT /notifications/read-all */
export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/read-all', {});
}

/** Prefer claim_number for claim-status screen; fall back to numeric claim_id. */
export function claimLookupRefFromNotification(n: AppNotification): string | null {
  const d = n.data;
  if (!d || typeof d !== 'object') return null;
  const num = d.claim_number;
  if (typeof num === 'string' && num.trim()) return num.trim();
  const id = d.claim_id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}

/** Card reference for patient intake (`card_number`, `card_no`, etc.). */
export function patientCardFromNotification(n: AppNotification): string | null {
  const d = n.data;
  if (!d || typeof d !== 'object') return null;
  const keys = [
    'card_number',
    'card_no',
    'member_card_number',
    'lnq_card',
    'patient_card',
  ] as const;
  for (const k of keys) {
    if (!(k in d)) continue;
    const v = d[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Index into `PatientRecord.members` when the notification targets one person on a family card. */
export function patientMemberIndexFromNotification(n: AppNotification): number | null {
  const d = n.data;
  if (!d || typeof d !== 'object') return null;
  const mi = d.member_index ?? d.memberIndex;
  if (typeof mi === 'number' && Number.isFinite(mi) && mi >= 0) {
    return Math.floor(mi);
  }
  if (typeof mi === 'string' && /^\d+$/.test(mi.trim())) {
    return Number(mi.trim());
  }
  return null;
}

export function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
