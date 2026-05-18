import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import {
  ANDROID_FCM_CHANNEL_ID,
  ANDROID_NOTIFICATION_CHANNEL_NAME,
} from '@/constants/notifications';

/**
 * Creates the Android notification channel used by FCM payloads.
 * Uses dynamic import so `expo-notifications` is never loaded in Expo Go (SDK 53+ crashes on Android).
 */
export async function ensureLuniqClinicAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return;
  const Notifications = await import('expo-notifications');
  await Notifications.setNotificationChannelAsync(ANDROID_FCM_CHANNEL_ID, {
    name: ANDROID_NOTIFICATION_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2EBDB4',
  });
}
