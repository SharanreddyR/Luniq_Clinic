import { isAxiosError } from 'axios';

import { api } from '@/services/http';
import type {
  ApiAuthUser,
  AuthUser,
  Clinic,
  ClinicLoginResponse,
  LoginApiEnvelope,
  LoginResult,
} from '@/types/auth';

export type {
  AuthUser,
  AuthResponse,
  Clinic,
  ClinicLoginResponse,
  LoginResult,
} from '@/types/auth';

export type ClinicLoginPayload = {
  phoneOrEmail: string;
  password: string;
};

function mapApiUserToAuthUser(u: ApiAuthUser): AuthUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email ?? '',
    phone: u.phone ?? undefined,
  };
}

function mapClinicFromApiUser(u: ApiAuthUser): Clinic {
  const cp = u.clinic_profile;
  return {
    id: u.id,
    name: cp?.clinic_name ?? u.name,
    contactName: u.name,
    phone: u.phone ?? undefined,
    address: cp?.city ? String(cp.city) : undefined,
  };
}

function loginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    // Laravel ValidationException: prefer field errors over generic "given data was invalid."
    const first =
      body?.errors &&
      Object.values(body.errors).find((v) => Array.isArray(v) && v[0])?.[0];
    if (first) return first;
    if (body?.message && typeof body.message === 'string') {
      return body.message;
    }
    if (err.response?.status === 401 || err.response?.status === 422) {
      return 'Invalid credentials. Retry again.';
    }
    return err.message || 'Sign-in failed. Try again.';
  }
  if (err instanceof Error) return err.message;
  return 'Sign-in failed. Try again.';
}

/**
 * Clinic / patient portal login — POST /auth/login (Laravel API v1).
 * Body: `{ login: phone or email, password }`.
 */
export async function loginRequest(
  phoneOrEmail: string,
  password: string,
): Promise<LoginResult> {
  const login = phoneOrEmail.trim();
  try {
    const { data } = await api.post<LoginApiEnvelope>('/auth/login', {
      login,
      password,
    });

    if (!data.success || !data.data?.token || !data.data?.user) {
      throw new Error(data.message || 'Login failed.');
    }

    const u = data.data.user;

    if (u.role === 'clinic') {
      return {
        kind: 'clinic',
        token: data.data.token,
        clinic: mapClinicFromApiUser(u),
      };
    }

    return {
      kind: 'user',
      token: data.data.token,
      user: mapApiUserToAuthUser(u),
    };
  } catch (err) {
    throw new Error(loginErrorMessage(err));
  }
}
