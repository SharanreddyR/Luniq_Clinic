import { useQuery } from '@tanstack/react-query';

import {
  type ClinicAppointmentStatus,
  fetchClinicAppointmentsPage,
} from '@/services/appointmentService';

export const clinicAppointmentsQueryKey = (
  status: ClinicAppointmentStatus,
) => ['clinic', 'appointments', status] as const;

export function useClinicAppointments(status: ClinicAppointmentStatus) {
  return useQuery({
    queryKey: clinicAppointmentsQueryKey(status),
    queryFn: () => fetchClinicAppointmentsPage({ status }),
    staleTime: 30_000,
    select: (page) => page.appointments,
  });
}
