export type PatientCardType =
  | 'Individual'
  | 'Family'
  | 'Couple'
  | 'Child'
  | string;

export type PatientMember = {
  id?: number;
  personId?: number;
  unifiedId?: string;
  name: string;
  photo: string;
  mobile: string;
  relation?: string;
  isPrimary?: boolean;
  age?: number | null;
  gender?: string | null;
};

/** GET /clinic/card/lookup?card_number=... */
export type PatientRecord = {
  id: number;
  name: string;
  photo: string;
  cardNumber: string;
  mobile?: string;
  cardType?: PatientCardType;
  status?: string;
  isValid?: boolean;
  purchasedAt?: string | null;
  expiresAt?: string | null;
  amountPaid?: string | null;
  planType?: string;
  benefits?: string[];
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
