import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ClinicTimingPayload,
  saveClinicTiming,
} from '@/services/clinicTimingService';

export function useSaveClinicTiming() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClinicTimingPayload) => saveClinicTiming(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinic-timing'] });
    },
  });
}
