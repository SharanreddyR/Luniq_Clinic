import { useQuery } from '@tanstack/react-query';

import { fetchClinicDashboard } from '@/services/clinicDashboardService';

export const CLINIC_DASHBOARD_QUERY_KEY = ['clinic', 'dashboard'] as const;

export function useClinicDashboardQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CLINIC_DASHBOARD_QUERY_KEY,
    queryFn: fetchClinicDashboard,
    staleTime: 45_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}
