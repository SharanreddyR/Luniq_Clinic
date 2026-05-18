import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME, spacing } from '@/constants';

/** Match native splash (`app.json` splash.backgroundColor). */
export const BOOT_SCREEN_BACKGROUND = '#0D2B2B' as const;

const BRAND_LOGO = require('@/assets/images/brand-logo.png');

const LOGO_SIZE = 104;
const LOADER_COLOR = '#22B8AE';

export const BOOT_WELCOME_SUBLINE = 'Your health journey starts here';

export function bootWelcomeTitle(): string {
  const first = APP_NAME.trim().split(/\s+/)[0] ?? 'Luniq';
  return `Welcome to ${first}`;
}

/** Logo + title + subtitle (shared boot + welcome screens). */
export function BootBrandBlock() {
  return (
    <View style={brandStyles.block}>
      <Image
        source={BRAND_LOGO}
        style={brandStyles.logo}
        resizeMode="contain"
        accessibilityLabel={`${APP_NAME} logo`}
      />
      <Text style={brandStyles.title}>{bootWelcomeTitle()}</Text>
      <Text style={brandStyles.subtitle}>{BOOT_WELCOME_SUBLINE}</Text>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  block: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg + spacing.sm,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
});

/**
 * Shown while fonts load (root layout) and while auth rehydrates (index).
 * Logo + welcome copy + cyan loader on dark teal.
 */
export function AppBootScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <BootBrandBlock />
          <ActivityIndicator
            size="large"
            color={LOADER_COLOR}
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
    marginTop: spacing.xxl + spacing.md,
  },
});
