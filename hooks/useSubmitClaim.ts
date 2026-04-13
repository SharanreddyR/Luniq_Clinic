import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ClaimSubmissionPayload,
  submitClaim,
} from '@/services/claimService';

export function useSubmitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClaimSubmissionPayload) => submitClaim(payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ['claim-status', data.claimId],
      });
    },
  });
}
