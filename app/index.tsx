import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { ClinicLogo } from '@/components/ClinicLogo';
import { colors } from '@/constants/Colors';
import { useAuthHydration } from '@/hooks/useAuthHydration';
import { useAuthStore } from '@/store/authStore';

const SPLASH_MS = 2000;

export default function SplashRoute() {
  const hydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!hydrated) return;

    const id = setTimeout(() => {
      router.replace(isAuthenticated ? '/home' : '/login');
    }, SPLASH_MS);

    return () => clearTimeout(id);
  }, [hydrated, isAuthenticated]);

  return (
    <View style={styles.screen}>
      <ClinicLogo variant="onPrimary" />
      <Text style={styles.tagline}>Care that fits your life</Text>
      <ActivityIndicator
        size="large"
        color={colors.onPrimary}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  tagline: {
    color: colors.onPrimary,
    opacity: 0.95,
    fontSize: 16,
    marginTop: -8,
    marginBottom: 32,
  },
  loader: {
    marginTop: 8,
  },
});
