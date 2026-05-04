import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchClinicClaimsPage } from '@/services/claimService';

export const CLINIC_CLAIMS_QUERY_KEY = ['clinic', 'claims'] as const;

const PER_PAGE = 15;

export function useClinicClaimsInfiniteQuery(options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: CLINIC_CLAIMS_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchClinicClaimsPage(pageParam as number, PER_PAGE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.current_page + 1 : undefined,
    staleTime: 30_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}
