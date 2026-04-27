import { create } from 'zustand';

/** Carries visit → claim handoff (PDF optional on some platforms). */
export type VisitClaimDraft = {
  opdRef: string;
  pdfUri: string | null;
  patientId: number;
  patientName: string;
  patientCardNumber: string;
  department: string;
  doctorName: string;
  services: string[];
  amount: string;
  symptoms: string;
};

type ClaimDraftState = {
  draft: VisitClaimDraft | null;
  setDraft: (d: VisitClaimDraft) => void;
  clearDraft: () => void;
};

export const useClaimDraftStore = create<ClaimDraftState>((set) => ({
  draft: null,
  setDraft: (d) => set({ draft: d }),
  clearDraft: () => set({ draft: null }),
}));
