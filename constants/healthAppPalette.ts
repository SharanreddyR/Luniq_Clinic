/**
 * HEALTHAPP colour system — single source of truth for Luniq Clinics / Clinic App.
 *
 * Role map:
 * - Primary (#2ebdb4): actions, links, selected tab, key icons
 * - Secondary (#062d2f): chrome, headers, strong titles
 * - Background (#f4f9f9): screen body behind cards
 * - Surface (#ffffff): cards, sheets, inputs
 * - Text primary / secondary: headings & body vs captions & metadata
 * - Accent (#c4f542): profile highlights, rings (sparingly)
 *
 * Native splash (`app.json`) uses `primary`; Paper/theme consume `colors` only.
 */
export const HEALTHAPP_PRIMARY = '#22B8AE' as const;
export const HEALTHAPP_SECONDARY = '#0A5257' as const;
export const HEALTHAPP_BACKGROUND = '#EAF6F4' as const;
export const HEALTHAPP_ACCENT = '#c4f542' as const;

/** Mid tone for MD3 secondaryContainer / info surfaces */
const HEALTHAPP_SECONDARY_ELEVATED = '#146D70' as const;

export const healthAppColors = {
  primary: HEALTHAPP_PRIMARY,
  secondary: HEALTHAPP_SECONDARY,
  accent: HEALTHAPP_ACCENT,
  /** Text/icons on accent (e.g. lime chip) */
  onAccent: HEALTHAPP_SECONDARY,
  secondaryElevated: HEALTHAPP_SECONDARY_ELEVATED,
  background: HEALTHAPP_BACKGROUND,
  surface: '#ffffff',
  /** Subtle fill vs background */
  surfaceVariant: '#DDF1EF',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  text: HEALTHAPP_SECONDARY,
  textMuted: '#557C7F',
  border: '#C3E1DD',
  error: '#b3261e',
  success: '#1b7a6c',
} as const;

export type HealthAppColors = typeof healthAppColors;
