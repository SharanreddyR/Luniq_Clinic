import { useMutation } from '@tanstack/react-query';

import { loginRequest } from '@/services/authService';
import { useAuthStore } from '@/store';

export function useLoginMutation() {
  const setClinicSession = useAuthStore((s) => s.setClinicSession);
  const setUserSession = useAuthStore((s) => s.setUserSession);

  return useMutation({
    mutationFn: ({
      phoneOrEmail,
      password,
    }: {
      phoneOrEmail: string;
      password: string;
    }) => loginRequest(phoneOrEmail, password),
    onSuccess: (data) => {
      if (data.kind === 'clinic') {
        setClinicSession(data.token, data.clinic);
      } else {
        setUserSession(data.token, data.user);
      }
    },
  });
}
