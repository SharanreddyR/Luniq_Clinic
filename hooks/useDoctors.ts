import { useQuery } from '@tanstack/react-query';

import { fetchDoctors } from '@/services/doctorService';

export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: fetchDoctors,
    staleTime: 20_000,
  });
}
