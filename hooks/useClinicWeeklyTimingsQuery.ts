import { useQuery } from '@tanstack/react-query';

import { fetchWeeklyTimingsFromProfile } from '@/services/clinicTimingService';

export function useClinicWeeklyTimingsQuery(enabled = true) {
  return useQuery({
    queryKey: ['clinic-profile-weekly-timings'],
    queryFn: fetchWeeklyTimingsFromProfile,
    enabled,
    staleTime: 60_000,
  });
}
