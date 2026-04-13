import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ActivePatient, PatientRecord } from '@/types/patient';

type PatientState = {
  activePatient: ActivePatient | null;
  setActivePatient: (patient: PatientRecord) => void;
  clearActivePatient: () => void;
};

export const usePatientStore = create<PatientState>()(
  persist(
    (set) => ({
      activePatient: null,
      setActivePatient: (patient) =>
        set({
          activePatient: patient,
        }),
      clearActivePatient: () => set({ activePatient: null }),
    }),
    {
      name: 'clinic-app-patient',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ activePatient: state.activePatient }),
    },
  ),
);
