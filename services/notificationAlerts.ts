import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'luniq_inbox';

let runtimeReady = false;

/**
 * Foreground/local alerts: banner + default notification sound (iOS/Android).
 * Skips web. Safe to call multiple times.
 */
export async function ensureNotificationAlertRuntime(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (runtimeReady) return true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 280, 120, 280],
        sound: 'default',
        enableVibrate: true,
      });
    }

    runtimeReady = true;
    return granted;
  } catch {
    return false;
  }
}

function androidTrigger(): Notifications.NotificationTriggerInput {
  return Platform.OS === 'android'
    ? { channelId: ANDROID_CHANNEL_ID }
    : null;
}

/**
 * Present a local notification immediately (system sound + banner when permitted).
 */
export async function presentLocalInboxAlert(input: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (Platform.OS === 'web') return;

  await ensureNotificationAlertRuntime();

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: input.data ?? {},
      },
      trigger: androidTrigger(),
    });
  } catch {
    /* ignore — Expo Go / simulator limitations */
  }
}
