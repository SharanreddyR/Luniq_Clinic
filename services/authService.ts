import { api } from '@/services/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Clinic = {
  id: number;
  name: string;
};

export type ClinicLoginResponse = {
  token: string;
  clinic: Clinic;
};

/** Mock used when the real API is unavailable (development / demo). */
export const MOCK_CLINIC_LOGIN_RESPONSE: ClinicLoginResponse = {
  token: 'clinic123',
  clinic: {
    id: 1,
    name: 'ABC Clinic',
  },
};

/**
 * Clinic staff / portal login — POST /clinic-login
 */
export async function clinicLoginRequest(
  email: string,
  password: string,
): Promise<ClinicLoginResponse> {
  try {
    const { data } = await api.post<ClinicLoginResponse>('/clinic-login', {
      email,
      password,
    });
    return data;
  } catch {
    await delay(700);
    if (!email.trim() || !password) {
      throw new Error('Please enter email and password.');
    }
    return MOCK_CLINIC_LOGIN_RESPONSE;
  }
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return data;
  } catch {
    await delay(900);
    if (!name.trim() || !email.trim() || !password) {
      throw new Error('Please fill in all fields.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    return {
      token: `demo-token-${Date.now()}`,
      user: {
        id: '1',
        name: name.trim(),
        email: email.trim(),
      },
    };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
