import { useMutation } from '@tanstack/react-query';

import { clinicLoginRequest } from '@/services/authService';
import { useAuthStore } from '@/store';

export function useLoginMutation() {
  const setClinicSession = useAuthStore((s) => s.setClinicSession);

  return useMutation({
    mutationFn: ({
      phoneOrEmail,
      password,
    }: {
      phoneOrEmail: string;
      password: string;
    }) => clinicLoginRequest(phoneOrEmail, password),
    onSuccess: (data) => {
      setClinicSession(data.token, data.clinic);
    },
  });
}
