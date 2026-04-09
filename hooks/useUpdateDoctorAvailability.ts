import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type UpdateAvailabilityPayload,
  updateDoctorAvailability,
} from '@/services/doctorService';

export function useUpdateDoctorAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAvailabilityPayload) =>
      updateDoctorAvailability(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}
