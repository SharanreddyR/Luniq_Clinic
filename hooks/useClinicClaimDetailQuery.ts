import { useQuery } from '@tanstack/react-query';

import { fetchClinicClaimDetail } from '@/services/claimService';

export const clinicClaimDetailQueryKey = (id: number) =>
  ['clinic', 'claims', 'detail', id] as const;

export function useClinicClaimDetailQuery(
  claimId: number | null,
  options?: { enabled?: boolean },
) {
  const enabled =
    (options?.enabled ?? true) &&
    claimId != null &&
    Number.isFinite(claimId) &&
    claimId > 0;

  return useQuery({
    queryKey:
      claimId != null && claimId > 0
        ? clinicClaimDetailQueryKey(claimId)
        : ['clinic', 'claims', 'detail', 'none'],
    queryFn: () => fetchClinicClaimDetail(claimId as number),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}
