import { useMutation } from '@tanstack/react-query';

import {
  type RegisterClinicPayload,
  registerRequest,
} from '@/services/authService';
import { useAuthStore } from '@/store';

export function useRegisterMutation() {
  const setClinicSession = useAuthStore((s) => s.setClinicSession);

  return useMutation({
    mutationFn: (payload: RegisterClinicPayload) => registerRequest(payload),
    onSuccess: (data, variables) => {
      setClinicSession(data.token, {
        ...data.clinic,
        contactName:
          data.clinic.contactName?.trim() || variables.name.trim(),
      });
    },
  });
}
