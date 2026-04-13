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
