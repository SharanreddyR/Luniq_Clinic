import { useQuery } from '@tanstack/react-query';

import type { ClinicTimingsApiRow } from '@/services/clinicTimingService';
import { fetchClinicTimingsApi } from '@/services/clinicTimingService';

export const CLINIC_TIMINGS_API_QUERY_KEY = ['clinic', 'timings', 'api'] as const;

export function useClinicTimingsApiQuery(options?: { enabled?: boolean }) {
  return useQuery<ClinicTimingsApiRow[]>({
    queryKey: CLINIC_TIMINGS_API_QUERY_KEY,
    queryFn: fetchClinicTimingsApi,
    staleTime: 30_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}
