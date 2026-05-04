import { useQuery } from '@tanstack/react-query';

import type { MyClinicServiceRow } from '@/services/clinicSetupServicesService';
import { fetchClinicSetupMyServices } from '@/services/clinicSetupServicesService';

export const CLINIC_SETUP_MY_SERVICES_QUERY_KEY = [
  'clinic-setup',
  'my-services',
] as const;

export function useClinicSetupMyServicesQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery<MyClinicServiceRow[]>({
    queryKey: CLINIC_SETUP_MY_SERVICES_QUERY_KEY,
    queryFn: fetchClinicSetupMyServices,
    staleTime: 60_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}
