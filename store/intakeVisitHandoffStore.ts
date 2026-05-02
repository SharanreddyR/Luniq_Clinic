import { create } from 'zustand';

import type {
  ClinicVisitCatalogItem,
  StartVisitResponse,
} from '@/services/visitService';

/** After POST /clinic/visits/start on intake — carries visit id, doctor, catalogue into Step 2. */
export type IntakeVisitHandoff = {
  visitId: number;
  doctorId: number;
  doctorName: string;
  doctorDepartment: string;
  visitMeta: StartVisitResponse | null;
  catalog: ClinicVisitCatalogItem[];
};

type State = {
  handoff: IntakeVisitHandoff | null;
  setHandoff: (h: IntakeVisitHandoff) => void;
  clearHandoff: () => void;
};

export const useIntakeVisitHandoffStore = create<State>((set) => ({
  handoff: null,
  setHandoff: (h) => set({ handoff: h }),
  clearHandoff: () => set({ handoff: null }),
}));
