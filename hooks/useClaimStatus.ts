import { useQuery } from '@tanstack/react-query';

import { fetchClaimStatus } from '@/services/claimService';

export function useClaimStatus(claimId: string | null) {
  return useQuery({
    queryKey: ['claim-status', claimId],
    queryFn: () => fetchClaimStatus(claimId),
    enabled: claimId != null && claimId.length > 0,
    staleTime: 30_000,
  });
}
