import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchClinicOpenVisitsPage,
  type ClinicOpenVisitRow,
  type ClinicOpenVisitsMeta,
} from '@/services/visitService';

export const CLINIC_OPEN_VISITS_QUERY_KEY = [
  'clinic',
  'visits',
  'open',
] as const;

export const CLINIC_OPEN_VISITS_PAGE_SIZE = 10;

export type ClinicOpenVisitsPagePayload = {
  data: ClinicOpenVisitRow[];
  meta: ClinicOpenVisitsMeta;
};

export function useClinicOpenVisitsInfiniteQuery(options?: {
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: [
      ...CLINIC_OPEN_VISITS_QUERY_KEY,
      CLINIC_OPEN_VISITS_PAGE_SIZE,
    ] as const,
    queryFn: ({ pageParam }) =>
      fetchClinicOpenVisitsPage({
        page: pageParam as number,
        perPage: CLINIC_OPEN_VISITS_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      if (current_page >= last_page) return undefined;
      return current_page + 1;
    },
    staleTime: 60_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}

/** Alias for older call sites — same as {@link useClinicOpenVisitsInfiniteQuery}. */
export const useClinicOpenVisitsQuery = useClinicOpenVisitsInfiniteQuery;
