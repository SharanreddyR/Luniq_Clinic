import { useQuery } from '@tanstack/react-query';

import type { AvailableServicesResult } from '@/services/clinicSetupServicesService';
import { fetchClinicSetupAvailableServices } from '@/services/clinicSetupServicesService';

export const CLINIC_SETUP_AVAILABLE_SERVICES_QUERY_KEY = [
  'clinic-setup',
  'available-services',
] as const;

export function useClinicSetupAvailableServicesQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery<AvailableServicesResult>({
    queryKey: CLINIC_SETUP_AVAILABLE_SERVICES_QUERY_KEY,
    queryFn: fetchClinicSetupAvailableServices,
    staleTime: 60_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}
