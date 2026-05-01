import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/constants/Colors';

/** 4pt spacing scale */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

/** Radius tokens */
export const radii = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
  card: 16,
  button: 12,
} as const;

/** Elevation tokens */
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#062d2f',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: {
      elevation: 1,
    },
    default: {
      elevation: 1,
    },
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#062d2f',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: {
      elevation: 3,
    },
    default: {
      elevation: 3,
    },
  }),
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#062d2f',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    default: {
      elevation: 6,
    },
  }),
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#062d2f',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: {
      elevation: 2,
    },
    default: {
      elevation: 2,
    },
  }),
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** App typography (Paper variants follow theme.ts). */
export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeights.extrabold as TextStyle['fontWeight'],
    color: colors.text,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeights.bold as TextStyle['fontWeight'],
    color: colors.text,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: fontWeights.semibold as TextStyle['fontWeight'],
    color: colors.text,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  } satisfies TextStyle,
  small: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  } satisfies TextStyle,
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.semibold as TextStyle['fontWeight'],
    color: colors.text,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold as TextStyle['fontWeight'],
    color: colors.text,
    letterSpacing: 0.2,
  } satisfies TextStyle,
} as const;

/**
 * @expo/vector-icons — sizes 22–26, clinic palette (primary / secondary).
 */
export const clinicIcons = {
  /** Space between icon and adjacent label/text */
  textGap: spacing.md,
  size: {
    sm: 22,
    md: 24,
    lg: 26,
  },
  color: {
    primary: colors.primary,
    secondary: colors.secondary,
    /** Muted feature / empty states */
    muted: colors.textMuted,
  },
} as const;
