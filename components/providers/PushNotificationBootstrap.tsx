import { useQueryClient } from '@tanstack/react-query';
import { isRunningInExpoGo } from 'expo';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { NOTIFICATIONS_QUERY_KEY } from '@/hooks/useNotifications';
import { useAppToast } from '@/hooks/useAppToast';
import { ensureLuniqClinicAndroidNotificationChannel } from '@/services/androidNotificationChannel';
import { logFcmSyncError, syncFcmTokenWithBackend } from '@/services/fcmTokenService';
import { subscribeFirebaseTokenRefresh } from '@/services/firebaseMessaging';
import {
  getFcmDeviceTokenOrNull,
  recordInitialNotificationResponse,
  subscribeToForegroundFcm,
  subscribeToNotificationResponses,
} from '@/services/pushNotifications';
import { useAuthStore } from '@/store';

/**
 * Firebase Cloud Messaging: `messaging().getToken()` → POST /auth/fcm-token,
 * token refresh, notification open / cold start routing, foreground toast + inbox refresh.
 */
export function PushNotificationBootstrap() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { showInfo } = useAppToast();
  const lastSyncedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isRunningInExpoGo()) {
      void ensureLuniqClinicAndroidNotificationChannel();
    }
    const removeTap = subscribeToNotificationResponses();
    void recordInitialNotificationResponse();
    return removeTap;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || isRunningInExpoGo()) return;
    const removeFg = subscribeToForegroundFcm((data) => {
      void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] });
      const type = typeof data.type === 'string' ? data.type : 'update';
      const title =
        type === 'claim_approved'
          ? 'Claim approved'
          : type === 'claim_rejected'
            ? 'Claim rejected'
            : type === 'claim_under_review'
              ? 'Claim under review'
              : type === 'appointment_confirmed'
                ? 'Appointment confirmed'
                : type === 'appointment_rejected'
                  ? 'Appointment update'
                  : 'Notification';
      showInfo(title);
    });
    return removeFg;
  }, [queryClient, showInfo]);

  useEffect(() => {
    if (Platform.OS === 'web' || !token) {
      lastSyncedTokenRef.current = null;
      return;
    }
    if (isRunningInExpoGo()) return;

    let cancelled = false;

    async function syncIfNeeded() {
      const fcm = await getFcmDeviceTokenOrNull();
      if (cancelled || !fcm) return;
      if (fcm === lastSyncedTokenRef.current) return;
      try {
        await syncFcmTokenWithBackend(fcm);
        lastSyncedTokenRef.current = fcm;
      } catch (e) {
        logFcmSyncError(e, 'sync');
      }
    }

    void syncIfNeeded();

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] });
      void syncIfNeeded();
    });

    const unsubToken = subscribeFirebaseTokenRefresh(async (next) => {
      if (!next?.trim()) return;
      if (next === lastSyncedTokenRef.current) return;
      try {
        await syncFcmTokenWithBackend(next.trim());
        lastSyncedTokenRef.current = next.trim();
      } catch (e) {
        logFcmSyncError(e, 'token-rotation');
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
      unsubToken();
    };
  }, [token, queryClient]);

  return null;
}
