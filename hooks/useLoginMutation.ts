import { useMutation } from '@tanstack/react-query';

import { loginRequest } from '@/services/authService';
import { registerFcmAfterAuth } from '@/services/fcmTokenService';
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
    }) => loginRequest(phoneOrEmail, password),
    onSuccess: async (data) => {
      setClinicSession(data.token, data.clinic);
      await registerFcmAfterAuth('login');
    },
  });
}
