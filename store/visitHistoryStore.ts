import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ClinicVisitRecord } from '@/types/visitHistory';

type VisitHistoryState = {
  visits: ClinicVisitRecord[];
  addVisit: (visit: ClinicVisitRecord) => void;
  clearHistory: () => void;
};

export const useVisitHistoryStore = create<VisitHistoryState>()(
  persist(
    (set) => ({
      visits: [],
      addVisit: (visit) =>
        set((s) => ({ visits: [visit, ...s.visits] })),
      clearHistory: () => set({ visits: [] }),
    }),
    {
      name: 'clinic-app-visit-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ visits: state.visits }),
    },
  ),
);
