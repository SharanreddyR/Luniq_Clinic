import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AuthWordmark } from '@/components/auth/AuthScaffold';
import { BrandLogoMark } from '@/components/ClinicLogo';
import { APP_NAME, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAuthHydration } from '@/hooks/useAuthHydration';
import { useAuthStore } from '@/store';

const SPLASH_MS = 2200;

const LANDING_GRADIENT = ['#0a1f33', '#0f3d5c', '#156b8a', '#1a8a9e'] as const;

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
    <View style={styles.root}>
      <LinearGradient
        colors={[...LANDING_GRADIENT]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <View style={styles.logoGlow}>
          <BrandLogoMark size={112} padded />
        </View>
        <View style={styles.wordmarkWrap}>
          <AuthWordmark />
        </View>
        <Text style={styles.tagline}>Care that fits your life</Text>
        <ActivityIndicator
          size="large"
          color="rgba(255,255,255,0.9)"
          style={styles.loader}
        />
        <Text style={styles.footerHint}>{APP_NAME}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LANDING_GRADIENT[0],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  wordmarkWrap: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  logoGlow: {
    marginBottom: spacing.lg,
    shadowColor: '#2ebdb4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  tagline: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 17,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  loader: {
    marginTop: spacing.sm,
  },
  footerHint: {
    position: 'absolute',
    bottom: spacing.xl * 1.5,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
