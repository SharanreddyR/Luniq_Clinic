import { isAxiosError } from 'axios';

import { normalizeLoginIdentifier } from '@/utils/validation';
import { api } from '@/services/http';
import type {
  ApiAuthUser,
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

/** User-facing copy for wrong email/password (matches login screen + Alert). */
export const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

/** Member (`user`) accounts must use Luniq Care Card, not this clinic app. */
export const LOGIN_WRONG_APP_ROLE_MESSAGE =
  'This account is for Luniq members. Please sign in with the Luniq Care Card app.';

const CLINIC_ROLE = 'clinic';

function isGenericServerFailureMessage(message: string): boolean {
  return /something went wrong|went wrong.*try again/i.test(message);
}

function loginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const body = err.response?.data as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    const loginErrors = body?.errors?.login;
    if (Array.isArray(loginErrors) && loginErrors[0]) {
      const line = String(loginErrors[0]);
      if (/invalid credential|deactivated/i.test(line)) {
        return /deactivated/i.test(line) ? line : LOGIN_INVALID_CREDENTIALS_MESSAGE;
      }
      return line;
    }
    // Laravel ValidationException: prefer first field error
    const first =
      body?.errors &&
      Object.values(body.errors).find((v) => Array.isArray(v) && v[0])?.[0];
    if (first) return first;
    if (body?.message && typeof body.message === 'string') {
      if (isGenericServerFailureMessage(body.message)) {
        return LOGIN_INVALID_CREDENTIALS_MESSAGE;
      }
      return body.message;
    }
    if (status === 401 || status === 422) {
      return LOGIN_INVALID_CREDENTIALS_MESSAGE;
    }
    // Wrong-password path sometimes hits 500 + generic copy (e.g. server misconfig).
    if (status != null && status >= 500) {
      return LOGIN_INVALID_CREDENTIALS_MESSAGE;
    }
    return err.message || 'Sign-in failed. Try again.';
  }
  if (err instanceof Error) {
    if (isGenericServerFailureMessage(err.message)) {
      return LOGIN_INVALID_CREDENTIALS_MESSAGE;
    }
    return err.message;
  }
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
  const login = normalizeLoginIdentifier(phoneOrEmail);
  try {
    const { data } = await api.post<LoginApiEnvelope>('/auth/login', {
      login,
      password,
    });

    if (!data.success || !data.data?.token || !data.data?.user) {
      const m = data.message || 'Login failed.';
      if (isGenericServerFailureMessage(m)) {
        throw new Error(LOGIN_INVALID_CREDENTIALS_MESSAGE);
      }
      throw new Error(m);
    }

    const u = data.data.user;

    if (u.role !== CLINIC_ROLE) {
      throw new Error(LOGIN_WRONG_APP_ROLE_MESSAGE);
    }

    return {
      kind: 'clinic',
      token: data.data.token,
      clinic: mapClinicFromApiUser(u),
    };
  } catch (err) {
    throw new Error(loginErrorMessage(err));
  }
}
