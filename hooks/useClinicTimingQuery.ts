import { useQuery } from '@tanstack/react-query';

import { fetchClinicTiming } from '@/services/clinicTimingService';

export function useClinicTimingQuery(enabled = true) {
  return useQuery({
    queryKey: ['clinic-timing'],
    queryFn: fetchClinicTiming,
    enabled,
    staleTime: 20_000,
  });
}
