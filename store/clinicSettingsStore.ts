import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const DEFAULT_OPEN_TIME = '09:00';
export const DEFAULT_CLOSE_TIME = '18:00';

type ClinicSettingsState = {
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  setOpenTime: (value: string) => void;
  setCloseTime: (value: string) => void;
  setIsOpen: (value: boolean) => void;
  setTiming: (openTime: string, closeTime: string, isOpen: boolean) => void;
};

export const useClinicSettingsStore = create<ClinicSettingsState>()(
  persist(
    (set) => ({
      openTime: DEFAULT_OPEN_TIME,
      closeTime: DEFAULT_CLOSE_TIME,
      isOpen: true,
      setOpenTime: (openTime) => set({ openTime }),
      setCloseTime: (closeTime) => set({ closeTime }),
      setIsOpen: (isOpen) => set({ isOpen }),
      setTiming: (openTime, closeTime, isOpen) =>
        set({ openTime, closeTime, isOpen }),
    }),
    {
      name: 'clinic-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        openTime: state.openTime,
        closeTime: state.closeTime,
        isOpen: state.isOpen,
      }),
    },
  ),
);
