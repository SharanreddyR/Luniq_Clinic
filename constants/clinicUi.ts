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
/** Default tap target for primary actions (compact / sm). */
export const CLINIC_BUTTON_MIN_HEIGHT = 36;
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
  buttonContent:{
    paddingVertical: 4,
    paddingHorizontal: 12,
    minHeight: CLINIC_BUTTON_MIN_HEIGHT,
  },
  buttonCompact: {
    borderRadius: radii.button,
  },
  buttonContentCompact: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    minHeight: 32,
  },
  headerTitle: typography.headerTitle,
} as const;

export { clinicIcons, radii, shadows, spacing, typography };
