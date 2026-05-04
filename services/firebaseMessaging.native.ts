import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

type MessagingPackage = typeof import('@react-native-firebase/messaging');

let messagingPackage: MessagingPackage | null | undefined;

function getMessagingPackage(): MessagingPackage | null {
  if (Platform.OS === 'web' || isRunningInExpoGo() || !Device.isDevice) {
    return null;
  }
  if (messagingPackage !== undefined) {
    return messagingPackage;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    messagingPackage = require('@react-native-firebase/messaging') as MessagingPackage;
  } catch {
    messagingPackage = null;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[FCM] Native Firebase is not in this app binary. Push uses RN Firebase only in a development/production build (expo run:android / EAS). Expo Go cannot load RNFBAppModule.',
      );
    }
  }
  return messagingPackage;
}

function firebaseMessaging() {
  const pkg = getMessagingPackage();
  return pkg ? pkg.default() : null;
}

export async function requestFcmPermission(): Promise<boolean> {
  const pkg = getMessagingPackage();
  if (!pkg) return false;
  try {
    const status = await pkg.default().requestPermission();
    const { AuthorizationStatus } = pkg;
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function getFirebaseFcmTokenOrNull(): Promise<string | null> {
  const m = firebaseMessaging();
  if (!m) return null;
  try {
    const t = await m.getToken();
    return t && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export function subscribeFirebaseTokenRefresh(cb: (token: string) => void): () => void {
  const m = firebaseMessaging();
  if (!m) return () => {};
  try {
    return m.onTokenRefresh(cb);
  } catch {
    return () => {};
  }
}

export function subscribeFirebaseForeground(
  handler: (data: Record<string, string>) => void,
): () => void {
  const m = firebaseMessaging();
  if (!m) return () => {};
  try {
    return m.onMessage(async (remoteMessage) => {
      const d = remoteMessage?.data;
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        handler(d as Record<string, string>);
      }
    });
  } catch {
    return () => {};
  }
}

export function subscribeFirebaseNotificationOpened(
  handler: (data: Record<string, string>) => void,
): () => void {
  const m = firebaseMessaging();
  if (!m) return () => {};
  try {
    return m.onNotificationOpenedApp((remoteMessage) => {
      const d = remoteMessage?.data;
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        handler(d as Record<string, string>);
      }
    });
  } catch {
    return () => {};
  }
}

export async function getFirebaseInitialMessageData(): Promise<Record<
  string,
  string
> | null> {
  const m = firebaseMessaging();
  if (!m) return null;
  try {
    const remoteMessage = await m.getInitialNotification();
    const d = remoteMessage?.data;
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      return d as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return null;
}
