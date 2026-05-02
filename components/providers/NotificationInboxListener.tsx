import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { NOTIFICATIONS_QUERY_KEY } from '@/hooks/useNotifications';
import {
  fetchNotificationsPage,
  type AppNotification,
} from '@/services/notificationService';
import { presentLocalInboxAlert, ensureNotificationAlertRuntime } from '@/services/notificationAlerts';
import { useAuthStore } from '@/store';

const POLL_MS = 32_000;

function pickAlertPayload(newItems: AppNotification[]): {
  title: string;
  body: string;
  data: Record<string, unknown>;
} {
  const sorted = [...newItems].sort((a, b) => b.id - a.id);
  const latest = sorted[0];
  if (newItems.length === 1 && latest) {
    return {
      title: latest.title,
      body: latest.body,
      data: {
        notificationId: latest.id,
        type: latest.type,
        ...(latest.data && typeof latest.data === 'object' ? latest.data : {}),
      },
    };
  }
  return {
    title: `${newItems.length} new notifications`,
    body: latest
      ? `${latest.title} · ${latest.body}`
      : 'Open the inbox to read updates.',
    data: {
      notificationId: latest?.id,
      batchCount: newItems.length,
    },
  };
}

/**
 * Polls GET /notifications while logged in and the app is active; when new rows
 * appear (vs last poll), plays system notification sound + banner via local notification.
 */
export function NotificationInboxListener() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const lastSeenMaxIdRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void ensureNotificationAlertRuntime();
  }, []);

  useEffect(() => {
    if (!token) {
      lastSeenMaxIdRef.current = null;
    }
  }, [token]);

  useEffect(() => {
    if (!token || Platform.OS === 'web') return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function poll() {
      if (cancelled || !token) return;
      if (appStateRef.current !== 'active') return;

      try {
        const page = await fetchNotificationsPage(1, 25);
        if (cancelled) return;

        const rows = page.data;
        if (rows.length === 0) {
          lastSeenMaxIdRef.current = lastSeenMaxIdRef.current ?? 0;
          return;
        }

        const maxId = Math.max(...rows.map((r) => r.id));

        if (lastSeenMaxIdRef.current === null) {
          lastSeenMaxIdRef.current = maxId;
          return;
        }

        const newItems = rows.filter((r) => r.id > lastSeenMaxIdRef.current!);
        if (newItems.length > 0) {
          lastSeenMaxIdRef.current = maxId;
          void queryClient.invalidateQueries({
            queryKey: [...NOTIFICATIONS_QUERY_KEY],
          });
          const payload = pickAlertPayload(newItems);
          await presentLocalInboxAlert(payload);
        } else {
          lastSeenMaxIdRef.current = Math.max(lastSeenMaxIdRef.current, maxId);
        }
      } catch {
        /* network — skip */
      }
    }

    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
      if (next === 'active') {
        void poll();
      }
    });

    void poll();
    interval = setInterval(() => void poll(), POLL_MS);

    return () => {
      cancelled = true;
      sub.remove();
      if (interval) clearInterval(interval);
    };
  }, [token, queryClient]);

  return null;
}
