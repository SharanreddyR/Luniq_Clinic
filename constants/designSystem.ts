import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/constants/Colors';

/** Consistent spacing (12–16px range) */
export const spacing = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
} as const;

/** Corner radii: cards 12–16, buttons 10 */
export const radii = {
  card: 14,
  button: 10,
  sm: 12,
  lg: 16,
} as const;

/** Soft card shadow */
export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#062d2f',
      shadowOffset: { width: 0, height: 2 },
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
} as const;

/**
 * Typography for custom Text (Paper variants follow theme.ts).
 * Title 18–20, subtitle 14–16, small 12–13.
 */
export const typography = {
  title: {
    fontSize: 19,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: colors.text,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  } satisfies TextStyle,
  small: {
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
  } satisfies TextStyle,
  headerTitle: {
    fontSize: 19,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: colors.text,
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
