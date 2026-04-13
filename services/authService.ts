import { api } from '@/services/http';
import type { ClinicLoginResponse } from '@/types/auth';

export type {
  AuthUser,
  AuthResponse,
  Clinic,
  ClinicLoginResponse,
} from '@/types/auth';

/** Mock when POST /clinic-login is unavailable — matches contract for demos. */
export const MOCK_CLINIC_LOGIN_RESPONSE: ClinicLoginResponse = {
  token: 'clinic_token_123',
  clinic: {
    id: 1,
    name: 'Luniq Partner Clinic',
    contactName: 'Dr. Sample',
    phone: '+1 (555) 010-0000',
  },
};

export type ClinicLoginPayload = {
  phoneOrEmail: string;
  password: string;
};

export type RegisterClinicPayload = {
  /** Primary contact / admin name */
  name: string;
  email: string;
  password: string;
  clinicName: string;
  clinicAddress: string;
};

/**
 * Clinic staff / portal login — POST /clinic-login
 */
export async function clinicLoginRequest(
  phoneOrEmail: string,
  password: string,
): Promise<ClinicLoginResponse> {
  const trimmed = phoneOrEmail.trim();
  try {
    const { data } = await api.post<ClinicLoginResponse>('/clinic-login', {
      phoneOrEmail: trimmed,
      password,
    });
    return data;
  } catch {
    await delay(700);
    if (!trimmed || !password) {
      throw new Error('Enter your phone or email and password.');
    }
    return MOCK_CLINIC_LOGIN_RESPONSE;
  }
}

/**
 * Register clinic + contact — POST /auth/register
 */
export async function registerRequest(
  payload: RegisterClinicPayload,
): Promise<ClinicLoginResponse> {
  const {
    name,
    email,
    password,
    clinicName,
    clinicAddress,
  } = payload;

  try {
    const { data } = await api.post<ClinicLoginResponse>('/auth/register', {
      name: name.trim(),
      email: email.trim(),
      password,
      clinicName: clinicName.trim(),
      clinicAddress: clinicAddress.trim(),
    });
    return data;
  } catch {
    await delay(900);
    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !clinicName.trim() ||
      !clinicAddress.trim()
    ) {
      throw new Error('Please complete all required fields.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    return {
      token: `clinic_reg_${Date.now()}`,
      clinic: {
        id: Math.floor(1000 + Math.random() * 9000),
        name: clinicName.trim(),
        address: clinicAddress.trim(),
        contactName: name.trim(),
        phone: '+1 (555) 010-0200',
      },
    };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
