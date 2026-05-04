import { useMutation } from '@tanstack/react-query';

import { loginRequest } from '@/services/authService';
import { registerFcmAfterAuth } from '@/services/fcmTokenService';
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
    onSuccess: async (data) => {
      if (data.kind === 'clinic') {
        setClinicSession(data.token, data.clinic);
      } else {
        setUserSession(data.token, data.user);
      }
      await registerFcmAfterAuth('login');
    },
  });
}
