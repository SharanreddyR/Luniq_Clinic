import { useQuery } from '@tanstack/react-query';

import { fetchDoctorsByDepartment } from '@/services/doctorService';

export function useDoctorsByDepartment(department: string | null) {
  const dept = department?.trim() ?? '';
  return useQuery({
    queryKey: ['doctors', 'department', dept],
    queryFn: () => fetchDoctorsByDepartment(dept),
    enabled: dept.length > 0,
    staleTime: 30_000,
  });
}
