import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { APP_NAME } from '@/constants/config';
import { colors } from '@/constants/Colors';

const BRAND_LOGO = require('@/assets/images/brand-logo.png');

type MarkProps = {
  size?: number;
  /** Extra padding inside a rounded container */
  padded?: boolean;
};

/**
 * Brand mark only (L mark) — use in headers, dashboard, lists.
 */
export function BrandLogoMark({ size = 40, padded = false }: MarkProps) {
  const inner = (
    <Image
      source={BRAND_LOGO}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={`${APP_NAME} logo`}
    />
  );
  if (!padded) return inner;
  const pad = Math.round(size * 0.12);
  return (
    <View
      style={[
        styles.markPad,
        {
          width: size + pad * 2,
          height: size + pad * 2,
          borderRadius: (size + pad * 2) * 0.22,
          padding: pad,
        },
      ]}>
      {inner}
    </View>
  );
}

type Props = {
  compact?: boolean;
  /** Logo on light surface on top of primary (e.g. splash screen). */
  variant?: 'default' | 'onPrimary';
};

export function ClinicLogo({ compact, variant = 'default' }: Props) {
  const onPrimary = variant === 'onPrimary';
  const logoSize = compact ? 64 : 100;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View
        style={[
          styles.logoShell,
          onPrimary && styles.logoShellOnPrimary,
          compact && styles.logoShellCompact,
        ]}>
        <Image
          source={BRAND_LOGO}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          accessibilityLabel={`${APP_NAME} logo`}
        />
      </View>
      {!compact && (
        <Text
          variant="headlineMedium"
          style={[styles.title, onPrimary && styles.titleOnPrimary]}>
          {APP_NAME}
        </Text>
      )}
      {!compact && (
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, onPrimary && styles.subtitleOnPrimary]}>
          Your health, organized
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  markPad: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  wrapCompact: {
    marginBottom: 16,
  },
  logoShell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  logoShellCompact: {
    marginBottom: 12,
    padding: 6,
    borderRadius: 18,
  },
  logoShellOnPrimary: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowOpacity: 0.12,
  },
  title: {
    color: colors.secondary,
    fontWeight: '700',
  },
  titleOnPrimary: {
    color: colors.onPrimary,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },
  subtitleOnPrimary: {
    color: colors.onPrimary,
    opacity: 0.92,
  },
});
