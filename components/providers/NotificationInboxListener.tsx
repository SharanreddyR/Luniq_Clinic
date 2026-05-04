import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { NOTIFICATIONS_QUERY_KEY } from '@/hooks/useNotifications';
import { fetchNotificationsPage } from '@/services/notificationService';
import { useAuthStore } from '@/store';

const POLL_MS = 32_000;

/**
 * Polls GET /notifications while logged in and the app is active; when new rows
 * appear (vs last poll), refreshes the dashboard notifications query (no system banner).
 */
export function NotificationInboxListener() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const lastSeenMaxIdRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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
