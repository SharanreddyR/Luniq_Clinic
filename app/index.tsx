import { useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppBootScreen,
  BOOT_SCREEN_BACKGROUND,
} from '@/components/auth/AppBootScreen';
import { useAuthHydration } from '@/hooks/useAuthHydration';
import { useAuthStore } from '@/store';

/**
 * Boot while rehydrating, then route to home or welcome.
 * After hydrate, a solid-color bridge avoids a white flash before the next screen paints.
 */
export default function Index() {
  const hydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useLayoutEffect(() => {
    if (!hydrated) return;
    router.replace(isAuthenticated ? '/home' : '/welcome');
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return <AppBootScreen />;
  }

  return <View style={styles.bridge} />;
}

const styles = StyleSheet.create({
  bridge: {
    flex: 1,
    backgroundColor: BOOT_SCREEN_BACKGROUND,
  },
});
