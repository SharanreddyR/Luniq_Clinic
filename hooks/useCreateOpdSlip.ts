import { useMutation } from '@tanstack/react-query';

import { type OpdSlipPayload, createOpdSlip } from '@/services/opdService';

export function useCreateOpdSlip() {
  return useMutation({
    mutationFn: (payload: OpdSlipPayload) => createOpdSlip(payload),
  });
}
