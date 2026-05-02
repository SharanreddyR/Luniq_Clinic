import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  markAllNotificationsRead,
  markNotificationRead,
  fetchNotificationsPage,
} from '@/services/notificationService';
import { useAuthStore } from '@/store';

export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'infinite'] as const;

export function useNotificationsInfinite(perPage = 20) {
  const token = useAuthStore((s) => s.token);

  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, perPage],
    queryFn: ({ pageParam }) =>
      fetchNotificationsPage(pageParam as number, perPage),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.current_page + 1 : undefined,
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] });
    },
  });
}
