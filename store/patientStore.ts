import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  ActivePatient,
  PatientRecord,
  PatientVisitSession,
} from '@/types/patient';

type PatientState = {
  activePatient: ActivePatient | null;
  visitSession: PatientVisitSession | null;
  /** Ephemeral: filled by barcode scan, consumed on patient-intake focus */
  pendingCardInput: string | null;
  setActivePatient: (patient: PatientRecord) => void;
  clearActivePatient: () => void;
  setVisitSession: (session: PatientVisitSession | null) => void;
  clearVisitSession: () => void;
  setPendingCardInput: (value: string | null) => void;
  consumePendingCardInput: () => string | null;
};

export const usePatientStore = create<PatientState>()(
  persist(
    (set, get) => ({
      activePatient: null,
      visitSession: null,
      pendingCardInput: null,
      setActivePatient: (patient) =>
        set({
          activePatient: patient,
          visitSession: null,
        }),
      clearActivePatient: () =>
        set({ activePatient: null, visitSession: null }),
      setVisitSession: (session) => set({ visitSession: session }),
      clearVisitSession: () => set({ visitSession: null }),
      setPendingCardInput: (value) => set({ pendingCardInput: value }),
      consumePendingCardInput: () => {
        const v = get().pendingCardInput;
        if (v != null) set({ pendingCardInput: null });
        return v;
      },
    }),
    {
      name: 'clinic-app-patient',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activePatient: state.activePatient,
        visitSession: state.visitSession,
      }),
    },
  ),
);
