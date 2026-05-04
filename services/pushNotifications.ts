import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import {
  getFirebaseFcmTokenOrNull,
  getFirebaseInitialMessageData,
  requestFcmPermission,
  subscribeFirebaseForeground,
  subscribeFirebaseNotificationOpened,
} from '@/services/firebaseMessaging';

function numericClaimId(data: Record<string, unknown>): number | null {
  const v = data.claim_id;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
    const n = Number(v.trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function claimRefFromData(data: Record<string, unknown>): string | null {
  const num = data.claim_number;
  if (typeof num === 'string' && num.trim()) return num.trim();
  const id = data.claim_id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}

function isClaimNotificationPayload(data: Record<string, unknown>): boolean {
  const type = typeof data.type === 'string' ? data.type : '';
  return (
    type.startsWith('claim_') ||
    type === 'claim' ||
    'claim_number' in data ||
    'claim_id' in data
  );
}

function isAppointmentNotificationPayload(data: Record<string, unknown>): boolean {
  const type = typeof data.type === 'string' ? data.type : '';
  return type.startsWith('appointment_');
}

/**
 * Maps FCM `data` from backend ({@link NotificationService}) to in-app routes.
 *
 * Types: `claim_approved`, `claim_rejected`, `claim_under_review`,
 * `appointment_confirmed`, `appointment_rejected`.
 */
export function openScreenFromNotificationData(
  data: Record<string, unknown> | null | undefined,
): void {
  if (!data) return;

  if (isClaimNotificationPayload(data)) {
    const id = numericClaimId(data);
    if (id != null) {
      router.push({ pathname: '/claim-detail', params: { id: String(id) } });
      return;
    }
    const ref = claimRefFromData(data);
    if (ref) {
      router.push({ pathname: '/claim-status', params: { claimId: ref } });
    }
    return;
  }

  if (isAppointmentNotificationPayload(data)) {
    router.push('/appointments');
  }
}

function normalizeFcmData(data: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v;
  }
  return out;
}

/**
 * FCM registration token from `@react-native-firebase/messaging` — same value
 * Laravel stores in `users.fcm_token` and uses with Firebase Admin `toToken()`.
 */
export async function getFcmDeviceTokenOrNull(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;
  if (isRunningInExpoGo()) return null;

  const ok = await requestFcmPermission();
  if (!ok) return null;

  return getFirebaseFcmTokenOrNull();
}

/** User tapped a notification while app was in background. */
export function subscribeToNotificationResponses(): () => void {
  return subscribeFirebaseNotificationOpened((data) => {
    openScreenFromNotificationData(normalizeFcmData(data));
  });
}

/** Foreground FCM (app active) — use for in-app toast / inbox refresh. */
export function subscribeToForegroundFcm(
  handler: (data: Record<string, unknown>) => void,
): () => void {
  return subscribeFirebaseForeground((data) => {
    handler(normalizeFcmData(data));
  });
}

/** Cold start: app opened from quit state via notification. */
export async function recordInitialNotificationResponse(): Promise<void> {
  const data = await getFirebaseInitialMessageData();
  if (!data) return;
  openScreenFromNotificationData(normalizeFcmData(data));
}
