import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  confirmClinicAppointment,
  rejectClinicAppointment,
} from '@/services/appointmentService';

function invalidateAllAppointmentLists(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['clinic', 'appointments'] });
}

export function useConfirmClinicAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; notes?: string | null }) => {
      await confirmClinicAppointment(payload.id, payload.notes);
    },
    onSuccess: () => {
      void invalidateAllAppointmentLists(queryClient);
    },
  });
}

export function useRejectClinicAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; reason: string }) => {
      await rejectClinicAppointment(payload.id, payload.reason);
    },
    onSuccess: () => {
      void invalidateAllAppointmentLists(queryClient);
    },
  });
}
