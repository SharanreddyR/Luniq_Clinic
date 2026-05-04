import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

if (Platform.OS !== 'web' && !isRunningInExpoGo()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require('@react-native-firebase/messaging').default;
    messaging().setBackgroundMessageHandler(async () => {
      /* OS shows notification when payload includes a notification block. */
    });
  } catch {
    /* Binary without RN Firebase native modules */
  }
}
