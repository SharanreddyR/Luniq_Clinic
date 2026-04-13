import { useMutation } from '@tanstack/react-query';

import {
  type ClinicTimingPayload,
  saveClinicTiming,
} from '@/services/clinicTimingService';

export function useSaveClinicTiming() {
  return useMutation({
    mutationFn: (payload: ClinicTimingPayload) => saveClinicTiming(payload),
  });
}
