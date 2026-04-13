import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { colors } from '@/constants/Colors';

const baseFonts = MD3LightTheme.fonts;

/** React Native Paper MD3 — clinic palette, 10px roundness, readable type scale */
export const clinicPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 10,
  fonts: {
    ...baseFonts,
    titleLarge: {
      ...baseFonts.titleLarge,
      fontSize: 19,
      lineHeight: 26,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    titleMedium: {
      ...baseFonts.titleMedium,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    titleSmall: {
      ...baseFonts.titleSmall,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
    },
    bodyLarge: {
      ...baseFonts.bodyLarge,
      fontSize: 16,
      lineHeight: 24,
    },
    bodyMedium: {
      ...baseFonts.bodyMedium,
      fontSize: 15,
      lineHeight: 22,
    },
    bodySmall: {
      ...baseFonts.bodySmall,
      fontSize: 12.5,
      lineHeight: 18,
    },
    labelLarge: {
      ...baseFonts.labelLarge,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
    },
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.surfaceVariant,
    onPrimaryContainer: colors.secondary,
    secondary: colors.secondary,
    onSecondary: colors.onSecondary,
    secondaryContainer: colors.secondaryElevated,
    onSecondaryContainer: colors.surfaceVariant,
    tertiary: colors.accent,
    onTertiary: colors.onAccent,
    tertiaryContainer: 'rgba(196, 245, 66, 0.22)',
    onTertiaryContainer: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
    outline: colors.border,
    error: colors.error,
    onBackground: colors.text,
  },
};
