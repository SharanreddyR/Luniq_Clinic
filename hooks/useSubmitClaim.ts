import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ClaimSubmitPayload,
  submitClaim,
} from '@/services/claimService';

export function useSubmitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClaimSubmitPayload) => submitClaim(payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ['claim-status', data.claimId],
      });
    },
  });
}
