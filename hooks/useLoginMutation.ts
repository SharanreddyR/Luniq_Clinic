import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { clinicLoginRequest } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export function useLoginMutation() {
  const setClinicSession = useAuthStore((s) => s.setClinicSession);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      clinicLoginRequest(email, password),
    onSuccess: (data) => {
      setClinicSession(data.token, data.clinic);
      router.replace('/home');
    },
  });
}
