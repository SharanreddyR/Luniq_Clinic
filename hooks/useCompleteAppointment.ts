import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markAppointmentCompleted } from '@/services/appointmentService';

export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markAppointmentCompleted(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
