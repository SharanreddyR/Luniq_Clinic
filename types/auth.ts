export type AuthUser = {
  id: string;
  name: string;
  email: string;
  /** When available from API */
  phone?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Clinic = {
  id: number;
  name: string;
  /** Set at registration or from API */
  address?: string;
  /** Primary staff / contact name (e.g. from registration) */
  contactName?: string;
  /** Clinic or front-desk line when provided */
  phone?: string;
};

export type ClinicLoginResponse = {
  token: string;
  clinic: Clinic;
};
