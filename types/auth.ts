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

/** Laravel `UserResource` shape from POST /auth/login (`data.user`). */
export type ApiAuthUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  clinic_profile?: {
    clinic_name: string;
    license_number?: string | null;
    is_verified?: boolean;
    city?: string | null;
  } | null;
};

export type LoginApiEnvelope = {
  success: boolean;
  message?: string;
  data?: {
    user: ApiAuthUser;
    token: string;
    has_purchased_card?: boolean;
  };
};

/** Result of POST /auth/login mapped for the app session store. */
export type LoginResult =
  | { kind: 'clinic'; token: string; clinic: Clinic }
  | { kind: 'user'; token: string; user: AuthUser };
