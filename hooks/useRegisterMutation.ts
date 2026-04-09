import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { registerRequest } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export function useRegisterMutation() {
  const setUserSession = useAuthStore((s) => s.setUserSession);

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => registerRequest(name, email, password),
    onSuccess: (data) => {
      setUserSession(data.token, data.user);
      router.replace('/home');
    },
  });
}
