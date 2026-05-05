import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ANDROID_FCM_CHANNEL_ID,
  ANDROID_NOTIFICATION_CHANNEL_NAME,
} from '@/constants/notifications';

export async function ensureLuniqClinicAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return;
  await Notifications.setNotificationChannelAsync(ANDROID_FCM_CHANNEL_ID, {
    name: ANDROID_NOTIFICATION_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2EBDB4',
  });
}
