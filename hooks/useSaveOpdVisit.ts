import { useMutation } from '@tanstack/react-query';

import { type OpdVisitPayload, saveOpdVisit } from '@/services/opdService';

export function useSaveOpdVisit() {
  return useMutation({
    mutationFn: (payload: OpdVisitPayload) => saveOpdVisit(payload),
  });
}
