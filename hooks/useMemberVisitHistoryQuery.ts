import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchMemberVisitHistoryPage,
  type MemberVisitHistoryItem,
  type MemberVisitHistoryMeta,
} from '@/services/visitService';

export const MEMBER_VISIT_HISTORY_PAGE_SIZE = 10;

export function memberVisitHistoryQueryKey(personId: number) {
  return ['clinic', 'visits', 'member', personId, 'history'] as const;
}

export type MemberVisitHistoryPage = {
  items: MemberVisitHistoryItem[];
  meta: MemberVisitHistoryMeta;
};

export function useMemberVisitHistoryInfiniteQuery(
  personId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = personId != null ? Number(personId) : NaN;
  const enabled =
    (options?.enabled ?? true) && Number.isFinite(id) && id > 0;

  return useInfiniteQuery({
    queryKey: memberVisitHistoryQueryKey(enabled ? id : 0),
    queryFn: ({ pageParam }) =>
      fetchMemberVisitHistoryPage(id, {
        page: pageParam as number,
        perPage: MEMBER_VISIT_HISTORY_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      if (current_page >= last_page) return undefined;
      return current_page + 1;
    },
    staleTime: 30_000,
    retry: 1,
    enabled,
  });
}
