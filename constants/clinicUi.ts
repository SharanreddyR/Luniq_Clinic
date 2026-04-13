import { colors } from '@/constants/Colors';
import {
  clinicIcons,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants/designSystem';

export const CLINIC_CARD_RADIUS = radii.card;
export const CLINIC_BUTTON_RADIUS = radii.button;
export const CLINIC_BUTTON_MIN_HEIGHT = 50;
export const SCREEN_EDGE = spacing.lg;

/** Screen scroll container — horizontal 16, vertical rhythm 12–16 */
export const clinicScreen = {
  screenPadding: {
    paddingHorizontal: SCREEN_EDGE,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.card,
  },
  /** Flat outline card (no heavy shadow) */
  cardOutlined: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    borderRadius: radii.button,
  },
  buttonContent: {
    paddingVertical: 13,
    minHeight: CLINIC_BUTTON_MIN_HEIGHT,
  },
  buttonCompact: {
    borderRadius: radii.button,
  },
  buttonContentCompact: {
    paddingVertical: 11,
    minHeight: 48,
  },
  headerTitle: typography.headerTitle,
} as const;

export { clinicIcons, radii, shadows, spacing, typography };
