import { useQuery } from '@tanstack/react-query';

import { fetchAppointments } from '@/services/appointmentService';

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
    staleTime: 30_000,
  });
}
