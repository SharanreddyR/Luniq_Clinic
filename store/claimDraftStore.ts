import { create } from 'zustand';

/** Serializable copy of a picked/captured file for the claim draft. */
export type ClaimDraftStagedFile = {
  uri: string;
  name?: string;
  mimeType?: string | null;
};

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
  /** Files added on the Visit step — shown on claim for review and first-of-each hydrates slots. */
  intakeAttachments?: {
    prescription: ClaimDraftStagedFile[];
    report: ClaimDraftStagedFile[];
    bill: ClaimDraftStagedFile[];
  };
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
