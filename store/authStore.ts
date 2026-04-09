import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthUser, Clinic } from '@/services/authService';

type AuthState = {
  token: string | null;
  clinic: Clinic | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setClinicSession: (token: string, clinic: Clinic) => void;
  setUserSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      clinic: null,
      user: null,
      isAuthenticated: false,
      setClinicSession: (token, clinic) =>
        set({
          token,
          clinic,
          user: null,
          isAuthenticated: true,
        }),
      setUserSession: (token, user) =>
        set({
          token,
          user,
          clinic: null,
          isAuthenticated: true,
        }),
      clearSession: () =>
        set({
          token: null,
          clinic: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'clinic-app-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        clinic: state.clinic,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
