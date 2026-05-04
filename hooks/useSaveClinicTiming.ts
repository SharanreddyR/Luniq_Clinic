import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLINIC_TIMINGS_API_QUERY_KEY } from '@/hooks/useClinicTimingsApiQuery';
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
      void queryClient.invalidateQueries({
        queryKey: [...CLINIC_TIMINGS_API_QUERY_KEY],
      });
    },
  });
}
