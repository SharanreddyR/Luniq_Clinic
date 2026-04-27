export type PatientCardType = 'Individual' | 'Family' | 'Couple' | 'Child';

export type PatientMember = {
  name: string;
  photo: string;
  mobile: string;
};

/** GET /patient/:cardNumber */
export type PatientRecord = {
  id: number;
  name: string;
  photo: string;
  cardNumber: string;
  mobile?: string;
  cardType?: PatientCardType;
  /** For Family / Couple / Child cards — linked people */
  members?: PatientMember[];
};

/** Stored in Zustand after lookup (same as API record) */
export type ActivePatient = PatientRecord;

/** Doctor chosen on the visit & billing step (before OPD) */
export type VisitSessionDoctor = {
  id: number;
  name: string;
  /** Specialty / unit — maps from clinic doctor `department` */
  profession: string;
};

/** Services + billing captured after patient confirmation, before OPD */
export type PatientVisitSession = {
  /** Set from Visit & billing; may be absent on older persisted sessions */
  doctor?: VisitSessionDoctor;
  services: string[];
  /** User-entered amount string (e.g. "450" or "1,250.50") */
  amount: string;
};
