import { isAxiosError } from 'axios';

import { api } from '@/services/http';
import { getFcmDeviceTokenOrNull } from '@/services/pushNotifications';

/** Persists the FCM registration token from `@react-native-firebase/messaging` for backend sends. */
export async function syncFcmTokenWithBackend(fcmToken: string): Promise<void> {
  const trimmed = fcmToken.trim();
  if (!trimmed) return;

  await api.post('/auth/fcm-token', { fcm_token: trimmed });
}

/**
 * Registers the device push token with `POST /auth/fcm-token` after the user is
 * authenticated (Bearer must already be on the shared `api` client — e.g. right
 * after {@link useAuthStore} session is set).
 */
export async function registerFcmAfterAuth(context = 'auth'): Promise<void> {
  const fcm = await getFcmDeviceTokenOrNull();
  if (!fcm) return;
  try {
    await syncFcmTokenWithBackend(fcm);
  } catch (e) {
    logFcmSyncError(e, context);
  }
}

export function logFcmSyncError(err: unknown, context: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const msg = isAxiosError(err)
      ? err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message
      : err instanceof Error
        ? err.message
        : String(err);
    console.warn(`[Luniq Clinics] FCM token sync (${context}):`, msg);
  }
}
