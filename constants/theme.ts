import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { colors } from '@/constants/Colors';

export const clinicPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.surfaceVariant,
    onPrimaryContainer: colors.secondary,
    secondary: colors.secondary,
    onSecondary: colors.onSecondary,
    secondaryContainer: '#0d4a4d',
    onSecondaryContainer: colors.surfaceVariant,
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
