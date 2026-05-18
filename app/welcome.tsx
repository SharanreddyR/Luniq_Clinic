import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BOOT_SCREEN_BACKGROUND,
  BootBrandBlock,
} from '@/components/auth/AppBootScreen';

/** Brief branded pause so welcome is readable before sign-in. */
const AUTO_REDIRECT_MS = 900;

const LOADER_COLOR = '#22B8AE';

/**
 * After boot when signed out: same look as splash, no buttons — auto-opens login.
 * Signed-in users never reach this route (`index` sends them to `/home`).
 */
export default function WelcomeScreen() {
  const didNavigate = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (didNavigate.current) return;
      didNavigate.current = true;
      router.replace('/login');
    }, AUTO_REDIRECT_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <BootBrandBlock />
          <ActivityIndicator
            color={LOADER_COLOR}
            size="large"
            style={styles.loader}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BOOT_SCREEN_BACKGROUND,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 32,
  },
});
