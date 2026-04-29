import { useQuery } from '@tanstack/react-query';

import { fetchClinicProfile } from '@/services/clinicProfileService';

export function useClinicProfile(enabled = true) {
  return useQuery({
    queryKey: ['clinic-profile'],
    queryFn: fetchClinicProfile,
    enabled,
    staleTime: 30_000,
  });
}
